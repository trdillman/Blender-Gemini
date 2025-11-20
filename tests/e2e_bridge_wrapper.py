import bpy
import sys
import os
import time

# Add the project root to sys.path so we can import gemini_bridge
# This assumes the script is located in <project_root>/tests/
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)

if project_root not in sys.path:
    sys.path.append(project_root)

print(f"[-] E2E Wrapper: Project Root: {project_root}")

try:
    import gemini_bridge
    print("[-] E2E Wrapper: Module imported.")
except ImportError as e:
    print(f"[!] E2E Wrapper: Failed to import gemini_bridge: {e}")
    sys.exit(1)

print("[-] E2E Wrapper: Registering Gemini Bridge...")
gemini_bridge.register()

print("[-] E2E Wrapper: Bridge registered. Keeping process alive...")

# Keep alive loop to prevent Blender from exiting in headless mode
try:
    while True:
        # We need to process the events/timers if we want the server queue to work?
        # gemini_bridge uses bpy.app.timers to process the queue.
        # In headless mode, timers might not fire if the event loop isn't running?
        # But wait, 'bpy.app.timers' relies on the main loop.
        # A simple while True: sleep(1) blocks the main thread.
        # If the main thread is blocked, bpy.app.timers won't fire.
        
        # We need to step the window manager or allow timers to run.
        # But we can't easily "step" the loop in python without blocking.
        
        # However, the Server runs in a separate thread.
        # The Server accepts requests and puts them in EXECUTION_QUEUE.
        # The process_queue function is registered with bpy.app.timers.
        # If the main thread is sleeping in a while loop, timers WON'T run.
        
        # Attempt to update the window manager?
        # In background mode, this is tricky.
        
        # Alternative: Call process_queue manually in our loop.
        gemini_bridge.process_queue()
        time.sleep(0.05)
        
except KeyboardInterrupt:
    print("[-] E2E Wrapper: Stopping...")
    gemini_bridge.unregister()
