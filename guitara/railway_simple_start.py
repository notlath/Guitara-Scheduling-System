#!/usr/bin/env python3
"""
Simple Railway Production Startup - No CD Issues
Direct execution from /app/guitara working directory
"""

import os
import sys
import subprocess

print("🚀 RAILWAY PRODUCTION START (Simple)")
print(f"PORT: {os.environ.get('PORT', '8000')}")
print(f"Working directory: {os.getcwd()}")
print(f"Python executable: {sys.executable}")

# Ensure we're using production settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings_production")
print(f"🔧 Django settings: {os.environ['DJANGO_SETTINGS_MODULE']}")

# Get port from Railway
port = os.environ.get("PORT", "8000")


def main():
    """Start production server"""
    print(f"\n🚀 Starting production server on 0.0.0.0:{port}")

    # Use exec to replace the process (Railway best practice)
    cmd = [
        sys.executable,
        "-m",
        "daphne",
        "-b",
        "0.0.0.0",
        "-p",
        port,
        "--proxy-headers",
        "guitara.asgi:application",  # Use production ASGI
    ]

    print(f"Command: {' '.join(cmd)}")
    print("🚀 Starting server...")

    # Replace current process with daphne
    os.execvp(sys.executable, cmd)


if __name__ == "__main__":
    main()
