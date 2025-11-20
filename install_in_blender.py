import bpy
import os
import sys
import addon_utils

# Path to the single-file addon
ADDON_FILE = os.path.abspath("gemini_bridge.py")
MODULE_NAME = "gemini_bridge"

print(f"Installing addon from: {ADDON_FILE}")

try:
    # Install
    bpy.ops.preferences.addon_install(filepath=ADDON_FILE, overwrite=True)
    
    # Enable
    addon_utils.enable(MODULE_NAME, default_set=True)
    
    # Save Preferences so it stays enabled
    bpy.ops.wm.save_userpref()
    
        print(f"SUCCESS: {MODULE_NAME} installed and enabled.")
    # Fix: Prevent double loading by not using --python with this script if already installed as an addon.
except Exception as e:
    print(f"ERROR: Installation failed - {e}")
    sys.exit(1)
