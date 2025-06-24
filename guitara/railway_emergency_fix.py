#!/usr/bin/env python3
"""
Railway Emergency Redeploy Test - Version 2.0
Fix for 502 Bad Gateway on root URL
"""

import os
import sys
import time

# Version bump to trigger redeploy
EMERGENCY_VERSION = "2.0.1"
BUILD_TIME = int(time.time())

print(f"🚀 RAILWAY EMERGENCY FIX - Version {EMERGENCY_VERSION}")
print(f"🕐 Build time: {BUILD_TIME}")
print(f"🔧 Fixing 502 Bad Gateway on root URL")

# Export version info
os.environ["EMERGENCY_VERSION"] = EMERGENCY_VERSION
os.environ["BUILD_TIME"] = str(BUILD_TIME)

# Import and run the main start script
if __name__ == "__main__":
    # Import the original emergency start script
    from railway_emergency_start import main
    main()
