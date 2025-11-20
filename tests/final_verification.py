import requests
import sys
import json
import base64

TOKEN = "jaHKXD-sfsIPhl1NEKMXvYh_Pma2bKTUQnF9nJCNjXs"
BASE_URL = "http://localhost:8081"

def run_verification():
    print("🚀 Starting Final Verification...")
    headers = {"X-Blender-Token": TOKEN}

    # 1. Verify Bridge Connection
    print("\n1️⃣  Verifying Bridge Connection...")
    try:
        resp = requests.get(f"{BASE_URL}/", headers=headers, timeout=2)
        if resp.status_code == 200:
            print(f"   ✅ Success: Connected to {resp.text}")
        else:
            print(f"   ❌ Failed: Status {resp.status_code}")
            return
    except Exception as e:
        print(f"   ❌ Connection Error: {e}")
        return

    # 2. Execute Sample Python Script & Generate Basic Cube
    print("\n2️⃣  Generating Basic Cube (Python Execution)...")
    code = """
import bpy
bpy.ops.mesh.primitive_cube_add()
bpy.context.active_object.name = "Gemini_Test_Cube"
"""
    try:
        resp = requests.post(f"{BASE_URL}/execute", json={"code": code}, headers=headers)
        data = resp.json()
        if resp.status_code == 200 and data.get('success'):
            print(f"   ✅ Success: Cube created.")
        else:
            print(f"   ❌ Failed: {data}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    # 3. Inspect Geometry Node Graph (on the Cube)
    print("\n3️⃣  Inspecting Graph (Expecting Cube)...")
    try:
        # First ensure it has a modifier to inspect, or just inspect the object
        # The /inspect endpoint returns active object info even without nodes
        resp = requests.get(f"{BASE_URL}/inspect", headers=headers)
        data = resp.json()
        if resp.status_code == 200:
            active_obj = data.get("active_object")
            print(f"   ✅ Success: Active Object is '{active_obj}'")
            if active_obj == "Gemini_Test_Cube":
                print("      (Confirmed it matches the generated cube)")
            else:
                print(f"      (Warning: Expected 'Gemini_Test_Cube', got '{active_obj}')")
        else:
            print(f"   ❌ Failed: Status {resp.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    # 4. Capture Viewport Screenshot
    print("\n4️⃣  Capturing Screenshot...")
    try:
        resp = requests.get(f"{BASE_URL}/screenshot", headers=headers)
        data = resp.json()
        if resp.status_code == 200 and data.get("success"):
            image_data = data.get("image")
            # Verify it's valid base64
            try:
                base64.b64decode(image_data)
                print(f"   ✅ Success: Captured screenshot ({len(image_data)} bytes)")
            except:
                print("   ❌ Failed: Invalid Base64 image data")
        else:
            print(f"   ❌ Failed: {data}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

if __name__ == "__main__":
    run_verification()
