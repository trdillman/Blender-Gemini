import bpy
import sys

# This script is automatically executed by the blender_dev_runner.ps1
# It enables the addon so it is visible in the GUI despite --factory-startup

addon_name = "gemini_bridge"

print(f"[-] Startup Script: Attempting to enable addon '{addon_name}'...")

try:
    if addon_name not in bpy.context.preferences.addons:
        bpy.ops.preferences.addon_enable(module=addon_name)
        print(f"[+] Successfully enabled '{addon_name}'")
    else:
        print(f"[.] Addon '{addon_name}' is already enabled.")
        
except Exception as e:
    print(f"[!] Error enabling addon: {e}")
    import traceback
    traceback.print_exc()

# Ensure we don't exit, so the user can interact with the GUI
