
bl_info = {
    "name": "Gemini Bridge",
    "author": "Gemini Assistant",
    "version": (2, 1, 1),
    "blender": (4, 5, 0),
    "location": "View3D > Sidebar > Gemini",
    "description": "Robust bridge for Gemini Web Assistant (v2.1.1)",
    "category": "Development",
}

import bpy
import http.server
import socketserver
import threading
import json
import sys
import io
import os
import queue
import traceback
import time
import tempfile
import base64
import secrets
import urllib.parse

# ==============================================================================
# CONSTANTS & CONFIG
# ==============================================================================
PORT = 8081
SERVER_TOKEN = secrets.token_urlsafe(32)

# PRODUCTION STORAGE:
# We use Blender's 'presets' folder in USER resources. 
# This persists across Blender updates/restarts and avoids permission issues.
DATA_DIR = os.path.join(bpy.utils.user_resource('SCRIPTS', path="presets"), "gemini_assistant_data")

if not os.path.exists(DATA_DIR):
    try:
        os.makedirs(DATA_DIR, exist_ok=True)
    except Exception as e:
        print(f"[Gemini] Error creating data directory: {e}")

HISTORY_FILE = os.path.join(DATA_DIR, "gemini_history.json")
MEMORY_FILE = os.path.join(DATA_DIR, "gemini_memory.txt")
TOOLS_FILE = os.path.join(DATA_DIR, "gemini_tools.json")

print(f"[Gemini] Bridge Loaded. Data Persistence: {DATA_DIR}")

# ==============================================================================
# UTILITIES
# ==============================================================================

class BlenderJSONEncoder(json.JSONEncoder):
    """Custom JSON encoder for Blender types."""
    def default(self, obj):
        try:
            if hasattr(obj, "to_tuple"):
                return obj.to_tuple()
            if hasattr(obj, "to_list"):
                return obj.to_list()
            if hasattr(obj, "tolist"): # Numpy support
                return obj.tolist()
            if hasattr(obj, "__iter__"):
                return list(obj)
        except:
            pass # Fallback to string representation
        return str(obj)

class GraphSerializer:
    """Handles serialization of Geometry Nodes trees."""
    
    @staticmethod
    def get_socket_value(socket):
        """Safely extracts a serializable value from a socket default."""
        try:
            if socket.is_linked:
                return None
            if not hasattr(socket, "default_value"):
                return None
            
            val = socket.default_value
            # Handle specific Blender types that might crash serialization
            if val is None: return None
            if hasattr(val, "to_tuple"): return val.to_tuple()
            if hasattr(val, "to_list"): return val.to_list()
            if isinstance(val, (int, float, str, bool)): return val
            return str(val) # Safe fallback
        except:
            return None

    @staticmethod
    def serialize(node_tree):
        if not node_tree: return None
        
        nodes_data = []
        for node in node_tree.nodes:
            try:
                inputs = {}
                for sock in node.inputs:
                    inputs[sock.identifier] = {
                        "name": sock.name,
                        "type": sock.type,
                        "is_linked": sock.is_linked,
                        "value": GraphSerializer.get_socket_value(sock)
                    }
                
                outputs = {}
                for sock in node.outputs:
                    outputs[sock.identifier] = {
                        "name": sock.name,
                        "type": sock.type,
                        "is_linked": sock.is_linked
                    }

                nodes_data.append({
                    "name": node.name,
                    "type": node.bl_idname,
                    "label": node.label,
                    "location": (round(node.location.x, 1), round(node.location.y, 1)),
                    "width": round(node.width, 1),
                    "inputs": inputs,
                    "outputs": outputs,
                    "mute": node.mute
                })
            except Exception as e:
                print(f"[Gemini] Error serializing node {node.name}: {e}")
                continue

        links_data = []
        for link in node_tree.links:
            try:
                links_data.append({
                    "from_node": link.from_node.name,
                    "from_socket": link.from_socket.identifier,
                    "to_node": link.to_node.name,
                    "to_socket": link.to_socket.identifier
                })
            except Exception:
                continue # Skip broken links

        return {
            "name": node_tree.name,
            "nodes": nodes_data,
            "links": links_data
        }

# ==============================================================================
# CORE BRIDGE LOGIC
# ==============================================================================

class BridgeCore:
    """Business logic for the Bridge."""
    
    @staticmethod
    def execute_python(code):
        old_stdout, old_stderr = sys.stdout, sys.stderr
        sys.stdout = stdout_capture = io.StringIO()
        sys.stderr = stderr_capture = io.StringIO()
        
        success = False
        try:
            # Provide a standard environment
            exec_globals = {"bpy": bpy, "C": bpy.context, "D": bpy.data}
            try:
                import math
                import random
                exec_globals["math"] = math
                exec_globals["random"] = random
            except: pass
            
            exec(code, exec_globals)
            success = True
        except Exception:
            traceback.print_exc(file=stderr_capture)
        finally:
            sys.stdout, sys.stderr = old_stdout, old_stderr
            
        # Force redraw of all 3D views
        try:
            for window in bpy.context.window_manager.windows:
                for area in window.screen.areas:
                    if area.type == 'VIEW_3D':
                        area.tag_redraw()
        except: pass
                
        return success, stdout_capture.getvalue(), stderr_capture.getvalue()

    @staticmethod
    def inspect_active_graph():
        data = {
            "active_object": None, 
            "modifiers": [], 
            "node_tree": None, 
            "nodes": [], 
            "links": [],
            "location": None,
            "rotation": None,
            "scale": None,
            "dimensions": None
        }
        
        try:
            obj = bpy.context.active_object
            if not obj:
                return {"error": "No active object selected. Please select an object.", **data}
                
            data["active_object"] = obj.name
            data["type"] = obj.type
            
            # Spatial Awareness
            try:
                data["location"] = [round(v, 3) for v in obj.location]
                data["rotation"] = [round(v, 3) for v in obj.rotation_euler]
                data["scale"] = [round(v, 3) for v in obj.scale]
                data["dimensions"] = [round(v, 3) for v in obj.dimensions]
            except:
                pass
            
            gn_mod = None
            for mod in obj.modifiers:
                data["modifiers"].append({"name": mod.name, "type": mod.type})
                if mod.type == 'NODES' and mod.node_group:
                    gn_mod = mod
                    if mod.is_active: break
                    
            if gn_mod:
                data["node_tree"] = GraphSerializer.serialize(gn_mod.node_group)
                if data["node_tree"]:
                    data["nodes"] = data["node_tree"].get("nodes", [])
                    data["links"] = data["node_tree"].get("links", [])
            else:
                data["error"] = "Active object has no Geometry Nodes modifier. Please create one."
        except Exception as e:
             data["error"] = f"Inspection failed: {str(e)}"
             traceback.print_exc()
            
        return data

    @staticmethod
    def capture_screenshot():
        try:
            fd, path = tempfile.mkstemp(suffix=".png")
            os.close(fd)
            
            original = bpy.context.scene.render.filepath
            bpy.context.scene.render.filepath = path
            
            # Capture viewport
            override = bpy.context.copy()
            found_view = False
            for area in bpy.context.screen.areas:
                if area.type == 'VIEW_3D':
                    override['area'] = area
                    found_view = True
                    break
            
            if found_view:
                bpy.ops.render.opengl(override, write_still=True)
                bpy.context.scene.render.filepath = original
                
                if os.path.exists(path):
                    with open(path, "rb") as f:
                        b64 = base64.b64encode(f.read()).decode('utf-8')
                    os.remove(path)
                    return b64
        except Exception as e:
            print(f"Screenshot error: {e}")
        return None

    @staticmethod
    def read_file(filepath, default=None):
        if os.path.exists(filepath):
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    return f.read()
            except Exception as e:
                print(f"Read Error {filepath}: {e}")
        return default

    @staticmethod
    def write_file(filepath, content):
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except Exception as e:
            print(f"Write Error {filepath}: {e}")
            return False

# ==============================================================================
# HTTP SERVER
# ==============================================================================

EXECUTION_QUEUE = queue.Queue()

class RequestHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args): pass # Silence logs

    def _send(self, status, data, is_json=True):
        try:
            self.send_response(status)
            self.send_header('Access-Control-Allow-Origin', '*')
            if is_json:
                self.send_header('Content-type', 'application/json')
                if not isinstance(data, str):
                    data = json.dumps(data, cls=BlenderJSONEncoder)
            else:
                self.send_header('Content-type', 'text/plain')
                
            self.end_headers()
            self.wfile.write(data.encode('utf-8'))
        except BrokenPipeError:
            pass
        except Exception as e:
            print(f"[Gemini] Send Error: {e}")

    def _read_body(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            return self.rfile.read(length).decode('utf-8')
        except:
            return "{}"

    def _authorized(self):
        token = self.headers.get('X-Blender-Token', '')
        if token == SERVER_TOKEN:
            return True
        self._send(401, {'error': 'Invalid or missing token'})
        return False

    def _queue_task(self, task_func):
        container = {'done': False, 'result': None}
        def wrapped_task():
            try:
                container['result'] = task_func()
            except Exception as e:
                print(f"[Gemini] Task Error: {e}")
                container['result'] = None
            container['done'] = True
        EXECUTION_QUEUE.put(wrapped_task)
        
        timeout = 15 # Increased timeout for heavy tasks
        start = time.time()
        while not container['done']:
            if time.time() - start > timeout: return None
            time.sleep(0.01)
        return container['result']

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, X-Blender-Token')
        self.end_headers()

    def do_GET(self):
        if not self._authorized():
            return
        if self.path == '/':
            self._send(200, "Gemini Bridge Online V2.1.1", False)
        elif self.path == '/history':
            data = self._queue_task(lambda: BridgeCore.read_file(HISTORY_FILE, "[]"))
            self._send(200, data, is_json=True)
        elif self.path == '/inspect':
            data = self._queue_task(BridgeCore.inspect_active_graph)
            self._send(200, data)
        elif self.path == '/screenshot':
            b64 = self._queue_task(BridgeCore.capture_screenshot)
            self._send(200, {'success': bool(b64), 'image': b64})
        elif self.path in ['/memory', '/tools']:
            path = MEMORY_FILE if self.path == '/memory' else TOOLS_FILE
            default = "[]" if self.path == '/tools' else ""
            content = BridgeCore.read_file(path, default)
            
            if self.path == '/tools':
                # Filter out system tools from the UI response
                try:
                    tools = json.loads(content)
                    system_tool_names = [
                        'remember', 'create_tool', 'run_tool', 'inspect_graph', 
                        'get_screenshot', 'execute_code', 'search_knowledge_base',
                        'qdrant_list_collections', 'qdrant_create_collection', 
                        'qdrant_delete_collection', 'qdrant_add_knowledge'
                    ]
                    # Filter by name (or trigger if name is ambiguous)
                    filtered_tools = [t for t in tools if t.get('name') not in system_tool_names]
                    self._send(200, filtered_tools, is_json=True)
                except:
                    self._send(200, [], is_json=True)
            else:
                self._send(200, content, is_json=False)

    def do_POST(self):
        if not self._authorized():
            return
        data = self._read_body()
        if self.path == '/execute':
            try:
                payload = json.loads(data)
                code = payload.get('code', '')
                success, out, err = self._queue_task(lambda: BridgeCore.execute_python(code))
                self._send(200, {'success': success, 'stdout': out, 'stderr': err})
            except:
                self._send(400, {'error': 'Invalid Request'})
        elif self.path == '/history':
            self._queue_task(lambda: BridgeCore.write_file(HISTORY_FILE, data))
            self._send(200, {'success': True})
        elif self.path == '/memory':
            current = []
            if os.path.exists(MEMORY_FILE):
                try:
                    with open(MEMORY_FILE, 'r', encoding='utf-8') as f: current = f.readlines()
                except: pass
            if data: current.extend((data + '\n').splitlines(keepends=True))
            if len(current) > 250: current = current[-250:]
            self._queue_task(lambda: BridgeCore.write_file(MEMORY_FILE, "".join(current)))
            self._send(200, {'success': True})
        elif self.path == '/tools':
            try:
                new_tool = json.loads(data)
                tools = []
                if os.path.exists(TOOLS_FILE):
                    try:
                        with open(TOOLS_FILE, 'r', encoding='utf-8') as f: tools = json.load(f)
                    except: pass
                tools = [t for t in tools if t.get('trigger') != new_tool.get('trigger')]
                tools.append(new_tool)
                self._queue_task(lambda: BridgeCore.write_file(TOOLS_FILE, json.dumps(tools, indent=2)))
                self._send(200, {'success': True})
            except:
                self._send(400, {'error': 'Invalid JSON'})

    def do_PUT(self):
        if not self._authorized():
            return
        data = self._read_body()
        if self.path == '/memory':
            self._queue_task(lambda: BridgeCore.write_file(MEMORY_FILE, data))
            self._send(200, {'success': True})

    def do_DELETE(self):
        if not self._authorized():
            return
        if self.path == '/tools':
            try:
                trigger = json.loads(self._read_body()).get('trigger')
                if os.path.exists(TOOLS_FILE):
                    with open(TOOLS_FILE, 'r', encoding='utf-8') as f: tools = json.load(f)
                    tools = [t for t in tools if t.get('trigger') != trigger]
                    self._queue_task(lambda: BridgeCore.write_file(TOOLS_FILE, json.dumps(tools, indent=2)))
                self._send(200, {'success': True})
            except:
                self._send(400, {'error': 'Failed to delete'})

# ==============================================================================
# ADDON REGISTRATION & UI
# ==============================================================================

class GeminiPreferences(bpy.types.AddonPreferences):
    bl_idname = __name__

    api_key: bpy.props.StringProperty(
        name="API Key",
        description="Google GenAI API Key",
        subtype='PASSWORD',
        default=""
    )
    model: bpy.props.EnumProperty(
        name="Model",
        items=[
            ('gemini-2.5-flash', "Gemini 2.5 Flash", "Fast, efficient (Default)"),
            ('gemini-2.5-pro', "Gemini 2.5 Pro", "Complex reasoning"),
            ('gemini-3-pro-preview', "Gemini 3 Pro (Preview)", "Advanced reasoning + Tools"),
        ],
        default='gemini-2.5-flash'
    )
    thinking_budget: bpy.props.IntProperty(
        name="Thinking Budget",
        description="Set to 0 to disable thinking mode",
        default=0,
        min=0,
        max=32768
    )
    verbosity: bpy.props.EnumProperty(
        name="Verbosity",
        items=[
            ('concise', "Concise", ""),
            ('normal', "Normal", ""),
            ('detailed', "Detailed", ""),
        ],
        default='normal'
    )

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "api_key")
        layout.prop(self, "model")
        # Show budget if model supports it (Gemini 3 mostly)
        if "gemini-3" in self.model or "thinking" in self.model:
            layout.prop(self, "thinking_budget")
        layout.prop(self, "verbosity")


def get_prefs(context):
    if __name__ in context.preferences.addons:
        return context.preferences.addons[__name__].preferences
    return None


class GEMINI_OT_LaunchAssistant(bpy.types.Operator):
    bl_idname = "gemini.launch_assistant"
    bl_label = "Launch Gemini Assistant"

    def execute(self, context):
        prefs = get_prefs(context)
        # POINT TO LOCALHOST REACT APP (Port 3000 as per vite.config.ts)
        base_url = "http://localhost:3000/" 

        params = {
            'token': SERVER_TOKEN,
            'model': 'gemini-2.5-flash',
            'thinkingBudget': 0,
            'verbosity': 'normal',
            'newSession': 'true',
            'toolsEnabled': 'true'
        }
        if prefs:
            params['model'] = prefs.model
            params['thinkingBudget'] = prefs.thinking_budget
            params['verbosity'] = prefs.verbosity
            if prefs.api_key:
                params['apiKey'] = prefs.api_key

        safe_params = {k: v for k, v in params.items() if v}
        query_string = urllib.parse.urlencode(safe_params)
        full_url = f"{base_url}?{query_string}"

        self.report({'INFO'}, f"Opening Gemini Assistant ({full_url})")
        bpy.ops.wm.url_open(url=full_url)
        return {'FINISHED'}


class GEMINI_PT_panel(bpy.types.Panel):
    bl_label = "Gemini Assistant"
    bl_idname = "GEMINI_PT_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'Gemini'

    def draw(self, context):
        layout = self.layout
        prefs = get_prefs(context)
        global HTTPD

        status_box = layout.box()
        if HTTPD:
            row = status_box.row()
            row.label(text="Status: Online", icon='CHECKBOX_HLT')
            row.operator("gemini.control_server", text="Stop", icon='CANCEL').action = 'STOP'
            status_box.label(text=f"Port: {PORT}")
        else:
            row = status_box.row()
            row.label(text="Status: Offline", icon='CHECKBOX_DEHLT')
            row.operator("gemini.control_server", text="Start", icon='PLAY').action = 'START'

        layout.operator("gemini.launch_assistant", text="Launch Interface", icon='URL')

        if prefs:
            layout.label(text="Quick Settings")
            layout.prop(prefs, "model", text="Model")
            if "thinking" in prefs.model or "gemini-3" in prefs.model:
                layout.prop(prefs, "thinking_budget", text="Thinking Budget")
            layout.prop(prefs, "verbosity", text="Verbosity")
        layout.separator()
        layout.label(text="Data Storage: User Scripts > Presets")


SERVER_THREAD = None
HTTPD = None


class ReusableTCPServer(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


def process_queue():
    try:
        while not EXECUTION_QUEUE.empty():
            task = EXECUTION_QUEUE.get_nowait()
            task()
    except Exception as e:
        print(f"Queue Error: {e}")
    return 0.05


def start_server():
    global HTTPD, SERVER_THREAD
    if HTTPD:
        print("[Gemini] Server already running.")
        return
    try:
        HTTPD = ReusableTCPServer(('127.0.0.1', PORT), RequestHandler)
        HTTPD.daemon_threads = True
        SERVER_THREAD = threading.Thread(target=HTTPD.serve_forever)
        SERVER_THREAD.daemon = True
        SERVER_THREAD.start()
        print(f"[Gemini] Server started on port {PORT}")

        if not bpy.app.timers.is_registered(process_queue):
            bpy.app.timers.register(process_queue)

    except OSError as e:
        print(f"[Gemini] Port {PORT} in use. Please stop other instances.")
        HTTPD = None
    except Exception as e:
        print(f"[Gemini] Failed to start server: {e}")


def stop_server():
    global HTTPD, SERVER_THREAD
    if HTTPD:
        try:
            HTTPD.shutdown()
            HTTPD.server_close()
        except:
            pass
        HTTPD = None
        SERVER_THREAD = None
        print("[Gemini] Server stopped")

    if bpy.app.timers.is_registered(process_queue):
        bpy.app.timers.unregister(process_queue)


class GEMINI_OT_control_server(bpy.types.Operator):
    bl_idname = "gemini.control_server"
    bl_label = "Toggle Server"
    action: bpy.props.StringProperty()

    def execute(self, context):
        if self.action == 'START':
            start_server()
        elif self.action == 'STOP':
            stop_server()
        return {'FINISHED'}


classes = (GeminiPreferences, GEMINI_OT_LaunchAssistant, GEMINI_OT_control_server, GEMINI_PT_panel)


def register():
    start_server()
    for cls in classes:
        bpy.utils.register_class(cls)


def unregister():
    stop_server()
    for cls in reversed(classes):
        bpy.utils.unregister_class(cls)


if __name__ == "__main__":
    register()
