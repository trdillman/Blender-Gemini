import subprocess
import time
import requests
import sys
import os
import signal

# Adjust this if 'blender' is not in PATH
BLENDER_BIN = "blender" 
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BRIDGE_SCRIPT = os.path.join(PROJECT_ROOT, "tests", "e2e_bridge_wrapper.py")

def run_e2e_test():
    print("========================================")
    print("Starting Blender E2E Test Runner")
    print("========================================")
    
    cmd = [BLENDER_BIN, "-b", "--factory-startup", "--python", BRIDGE_SCRIPT]
    
    print(f"Executing: {' '.join(cmd)}")
    
    # Launch Blender
    process = subprocess.Popen(
        cmd, 
        stdout=subprocess.PIPE, 
        stderr=subprocess.PIPE, 
        text=True,
        cwd=PROJECT_ROOT,
        bufsize=1 # Line buffered
    )
    
    token = None
    base_url = "http://localhost:8081"
    server_ready = False
    
    try:
        # Wait for server start and token
        start_time = time.time()
        timeout = 30 # seconds
        
        print("Waiting for Blender Server...")
        
        while time.time() - start_time < timeout:
            # Non-blocking read attempt
            line = process.stdout.readline()
            if line:
                clean_line = line.strip()
                # Print Blender output for debugging
                if "[Gemini]" in clean_line:
                    print(f"[BLENDER] {clean_line}")
                
                if "[Gemini] TOKEN:" in clean_line:
                    token = clean_line.split("TOKEN:")[1].strip()
                    print(f"✅ Captured Token: {token}")
                
                if "[Gemini] Server started on port" in clean_line:
                    print("✅ Server signal received.")
                    server_ready = True
            
            if token and server_ready:
                break
                
            # Check if process died
            if process.poll() is not None:
                print("❌ Blender process died unexpectedly.")
                print("STDERR:", process.stderr.read())
                sys.exit(1)
        
        if not token or not server_ready:
            raise TimeoutError("Timed out waiting for Blender Server or Token")

        # Wait a beat for the socket to be truly open
        time.sleep(2)

        headers = {"X-Blender-Token": token}

        # 1. Health Check
        print("\n[Test 1] Health Check (GET /)")
        connected = False
        for i in range(5):
            try:
                resp = requests.get(f"{base_url}/", headers=headers)
                if resp.status_code == 200:
                    print(f"✅ PASS: {resp.text}")
                    connected = True
                    break
                else:
                    print(f"⚠️ Attempt {i+1}: Status {resp.status_code}")
            except requests.exceptions.ConnectionError:
                 print(f"⚠️ Attempt {i+1}: Connection refused. Retrying...")
                 time.sleep(2)
        
        if not connected:
            print("❌ FAIL: Could not connect after 5 attempts.")
            sys.exit(1)

        # 2. Test Memory (Persistence)
        print("\n[Test 2] Memory Persistence (POST/GET /memory)")
        test_fact = "Test Fact: E2E Test Running"
        
        # POST
        requests.post(f"{base_url}/memory", data=test_fact, headers=headers)
        
        # GET
        resp = requests.get(f"{base_url}/memory", headers=headers)
        if test_fact in resp.text:
             print("✅ PASS: Fact retrieved.")
        else:
             print(f"❌ FAIL: Fact not found. Content: {resp.text}")
             sys.exit(1)

        # 3. Test Code Execution (Create Cube)
        print("\n[Test 3] Code Execution (POST /execute)")
        code_payload = {
            "code": "import bpy; bpy.ops.mesh.primitive_cube_add(); bpy.context.active_object.name = 'E2E_Cube'"
        }
        resp = requests.post(f"{base_url}/execute", json=code_payload, headers=headers)
        json_resp = resp.json()
        if resp.status_code == 200 and json_resp.get("success"):
             print("✅ PASS: Code executed.")
        else:
             print(f"❌ FAIL: {json_resp}")
             sys.exit(1)

        # 4. Test Inspection (Verify Cube)
        print("\n[Test 4] Graph/Scene Inspection (GET /inspect)")
        resp = requests.get(f"{base_url}/inspect", headers=headers)
        data = resp.json()
        
        if data.get("active_object") == "E2E_Cube":
             print("✅ PASS: Active object is 'E2E_Cube'.")
        else:
             print(f"❌ FAIL: Expected 'E2E_Cube', got {data.get('active_object')}")
             print(f"Full Response: {data}")
             sys.exit(1)

        print("\n" + "="*40)
        print("🎉 ALL E2E TESTS PASSED")
        print("="*40)

    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        # Dump stderr
        print("Blender STDERR:")
        print(process.stderr.read())
        sys.exit(1)
    finally:
        print("\nTerminating Blender...")
        process.terminate()
        process.wait()

if __name__ == "__main__":
    run_e2e_test()
