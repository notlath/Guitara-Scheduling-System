#!/usr/bin/env python3
"""
Comprehensive Django Server Startup Script
Handles server startup, port checking, and basic diagnostics
"""
import os
import sys
import subprocess
import socket
import time
import requests
from pathlib import Path


def check_port(port):
    """Check if a port is available"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(("localhost", port))
            return True
        except socket.error:
            return False


def kill_process_on_port(port):
    """Kill any process running on the specified port (Windows)"""
    try:
        # Windows command to find and kill process on port
        result = subprocess.run(["netstat", "-ano"], capture_output=True, text=True)
        lines = result.stdout.split("\n")

        for line in lines:
            if f":{port}" in line and "LISTENING" in line:
                # Extract PID (last column)
                parts = line.split()
                if len(parts) >= 5:
                    pid = parts[-1]
                    print(
                        f"🔍 Found process {pid} on port {port}, attempting to kill..."
                    )
                    subprocess.run(["taskkill", "/F", "/PID", pid], capture_output=True)
                    time.sleep(2)
                    break
    except Exception as e:
        print(f"⚠️ Error killing process on port {port}: {e}")


def start_django_server():
    """Start the Django development server"""
    port = 8000
    base_dir = Path(__file__).parent
    guitara_dir = base_dir / "guitara"
    manage_py = guitara_dir / "manage.py"

    print("🚀 Starting Django Server Diagnostic and Startup Script")
    print(f"📁 Base directory: {base_dir}")
    print(f"📁 Guitara directory: {guitara_dir}")
    print(f"📄 Manage.py path: {manage_py}")

    # Check if manage.py exists
    if not manage_py.exists():
        print(f"❌ manage.py not found at {manage_py}")
        return False

    # Check if port is available
    if not check_port(port):
        print(f"⚠️ Port {port} is already in use. Attempting to free it...")
        kill_process_on_port(port)
        time.sleep(3)

        if not check_port(port):
            print(f"❌ Port {port} is still in use. Please manually stop the process.")
            return False

    print(f"✅ Port {port} is available")

    # Change to guitara directory
    os.chdir(guitara_dir)
    print(f"📂 Changed directory to: {os.getcwd()}")

    # Start the server
    print("🚀 Starting Django development server...")
    try:
        # Check if virtual environment is activated
        venv_indicator = os.environ.get("VIRTUAL_ENV", "")
        if venv_indicator:
            print(f"🐍 Virtual environment detected: {venv_indicator}")
        else:
            print("⚠️ No virtual environment detected")

        # Start server in background
        process = subprocess.Popen(
            [sys.executable, "manage.py", "runserver", f"0.0.0.0:{port}"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        # Wait a bit for server to start
        time.sleep(5)

        # Check if server is running
        try:
            response = requests.get(f"http://localhost:{port}/api/", timeout=10)
            print(f"✅ Server is running! Status code: {response.status_code}")
            print(f"🌐 Server accessible at: http://localhost:{port}")
            print(f"🔗 API endpoint: http://localhost:{port}/api/")
            return True
        except requests.exceptions.RequestException as e:
            print(f"❌ Server startup failed or not responding: {e}")

            # Print server output for debugging
            stdout, stderr = process.communicate(timeout=5)
            if stdout:
                print("📋 Server stdout:")
                print(stdout)
            if stderr:
                print("📋 Server stderr:")
                print(stderr)
            return False

    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        return False


if __name__ == "__main__":
    success = start_django_server()
    if success:
        print("🎉 Django server started successfully!")
        print("📱 You can now use the frontend application.")
        print("🔄 The server will continue running in the background.")
    else:
        print("💥 Failed to start Django server. Please check the errors above.")
        sys.exit(1)
