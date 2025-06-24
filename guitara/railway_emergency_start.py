#!/usr/bin/env python3
"""
Ultra-simple Railway emergency startup - MINIMAL COMPLEXITY
Only starts emergency server with health endpoints
"""

import os
import sys
import subprocess
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

print("🆘 ULTRA-SIMPLE RAILWAY EMERGENCY START")
print(f"PORT: {os.environ.get('PORT', '8000')}")
print(f"Python version: {sys.version}")
print(f"Working directory: {os.getcwd()}")
print(f"Python path: {sys.path[:3]}")

# Force emergency settings
os.environ["DJANGO_SETTINGS_MODULE"] = "guitara.settings_emergency"
print(f"🔧 Django settings: {os.environ['DJANGO_SETTINGS_MODULE']}")

# Test Django setup quickly
try:
    print("🧪 Quick Django setup test...")
    import django

    django.setup()
    print("✅ Django setup successful")
except Exception as e:
    print(f"❌ Django setup failed: {e}")
    sys.exit(1)

# Get port from Railway
port = os.environ.get("PORT", "8000")


def main():
    """Start emergency server immediately"""
    print(f"\n🆘 Starting emergency server on 0.0.0.0:{port}")
    print("🔧 Server will bind to all interfaces (0.0.0.0)")

    # Build daphne command
    cmd = [
        sys.executable,
        "-m",
        "daphne",
        "-b",
        "0.0.0.0",  # Bind to all interfaces for Railway
        "-p",
        port,  # Use Railway's PORT
        "--proxy-headers",  # Handle Railway's proxy headers
        "-v",
        "2",  # Verbose logging
        "guitara.asgi_emergency:application",
    ]

    print(f"Command: {' '.join(cmd)}")
    print("🚀 Executing daphne server...")
    print("📡 Server should be accessible from Railway proxy...")

    # Run daphne - this will block until the server stops
    try:
        subprocess.run(cmd, check=True)
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"💥 Server failed: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
