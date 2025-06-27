#!/usr/bin/env python3
"""
Start Django with Daphne ASGI server for WebSocket support
"""
import os
import subprocess
import sys

# Change to the guitara directory
os.chdir("/home/notlath/Downloads/Guitara-Scheduling-System/guitara")

# Set environment variables
os.environ["DJANGO_SETTINGS_MODULE"] = "guitara.settings"

# Start Daphne
cmd = [
    "/home/notlath/Downloads/Guitara-Scheduling-System/venv/bin/python",
    "-m",
    "daphne",
    "-b",
    "127.0.0.1",
    "-p",
    "8000",
    "guitara.asgi:application",
]

print("🚀 Starting Django with Daphne ASGI server...")
print(f"Command: {' '.join(cmd)}")
print("📡 WebSocket support enabled")
print("🌐 Server will be available at http://127.0.0.1:8000")
print("📡 WebSocket endpoint: ws://127.0.0.1:8000/ws/scheduling/appointments/")

try:
    subprocess.run(cmd, check=True)
except KeyboardInterrupt:
    print("\n🛑 Server stopped")
except Exception as e:
    print(f"❌ Error: {e}")
    sys.exit(1)
