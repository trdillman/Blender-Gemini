import requests
import sys
import json

TOKEN = "VT-UyaaNQii2eDW6OJBc2Gz1u2LkxQ-UJNddbFJA-p0"
BASE_URL = "http://localhost:8081"

def test_live_connection():
    print(f"🔌 Connecting to Live Blender Instance at {BASE_URL}...")
    headers = {"X-Blender-Token": TOKEN}

    # 1. Health Check
    try:
        print("1️⃣  Testing Health Check (GET /).")
        resp = requests.get(f"{BASE_URL}/", headers=headers, timeout=2)
        if resp.status_code == 200:
            print(f"   ✅ Success: {resp.text}")
        else:
            print(f"   ❌ Failed: Status {resp.status_code} - {resp.text}")
            return
    except Exception as e:
        print(f"   ❌ Connection Error: {e}")
        return

    # 2. Memory Test
    print("\n2️⃣  Testing Memory (GET /memory).")
    try:
        resp = requests.get(f"{BASE_URL}/memory", headers=headers)
        if resp.status_code == 200:
            print(f"   ✅ Success: Retrieved {len(resp.text)} bytes of memory.")
        else:
            print(f"   ❌ Failed: Status {resp.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    # 3. Execution Test (Non-destructive)
    print("\n3️⃣  Testing Execution (POST /execute).")
    code = "print('[Gemini Live Test] Hello from CLI Agent!')"
    try:
        resp = requests.post(f"{BASE_URL}/execute", json={"code": code}, headers=headers)
        data = resp.json()
        if resp.status_code == 200 and data.get('success'):
            print(f"   ✅ Success: Code executed.")
            print(f"      Stdout: {data.get('stdout').strip()}")
        else:
            print(f"   ❌ Failed: {data}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

    # 4. Inspection Test
    print("\n4️⃣  Testing Scene Inspection (GET /inspect).")
    try:
        resp = requests.get(f"{BASE_URL}/inspect", headers=headers)
        data = resp.json()
        if resp.status_code == 200:
            if "error" in data:
                print(f"   ⚠️  Note: Inspection returned error (Expected if no object selected): {data['error']}")
            else:
                print(f"   ✅ Success: Active Object: {data.get('active_object', 'None')}")
        else:
            print(f"   ❌ Failed: Status {resp.status_code}")
    except Exception as e:
        print(f"   ❌ Error: {e}")

if __name__ == "__main__":
    test_live_connection()
