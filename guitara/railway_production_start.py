#!/usr/bin/env python3
"""
Railway Production Startup Script
Proper production server with database support
"""

import os
import sys
import subprocess
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

print("🚀 RAILWAY PRODUCTION START")
print(f"PORT: {os.environ.get('PORT', '8000')}")
print(f"Python version: {sys.version}")
print(f"Working directory: {os.getcwd()}")

# Use production settings (don't override if already set in environment)
if not os.environ.get("DJANGO_SETTINGS_MODULE"):
    os.environ["DJANGO_SETTINGS_MODULE"] = "guitara.settings_production"

print(f"🔧 Django settings: {os.environ['DJANGO_SETTINGS_MODULE']}")

# Test Django setup
try:
    print("🧪 Testing Django setup...")
    import django

    django.setup()
    print("✅ Django setup successful")

    # Test database connection
    from django.db import connection

    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        print(f"✅ Database connection successful: {result}")

except Exception as e:
    print(f"❌ Django/Database setup failed: {e}")
    import traceback

    traceback.print_exc()
    print("🔄 Continuing anyway - some issues might resolve at runtime...")

# Get port from Railway
port = os.environ.get("PORT", "8000")


def main():
    """Start production server with full database support"""
    print(f"\n🚀 Starting production server on 0.0.0.0:{port}")
    print("🔧 Using Daphne ASGI server with WebSocket support")

    # Build daphne command for production with WebSocket support
    cmd = [
        sys.executable,
        "-m",
        "daphne",
        "-b",
        "0.0.0.0",  # Bind to all interfaces for Railway
        "-p",
        port,  # Use Railway's PORT
        "--proxy-headers",  # Handle Railway's proxy headers
        "--websocket_timeout",
        "20",  # WebSocket timeout
        "--websocket_connect_timeout",
        "5",  # WebSocket connection timeout
        "-v",
        "1",  # Normal logging (not too verbose)
        "guitara.asgi:application",  # Use production ASGI with WebSocket support
    ]

    print(f"Command: {' '.join(cmd)}")
    print("🚀 Executing production Daphne server...")
    print("📡 Server accessible from Railway proxy with WebSocket support...")

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
