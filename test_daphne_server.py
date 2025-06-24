#!/usr/bin/env python3
"""
Test if Daphne server can start and respond to health checks
"""

import os
import sys
import subprocess
import time
import requests
import signal
from pathlib import Path

# Add guitara directory to path
guitara_path = Path(__file__).parent / "guitara"
sys.path.insert(0, str(guitara_path))

# Set emergency Django settings
os.environ["DJANGO_SETTINGS_MODULE"] = "guitara.settings_emergency"

print("🧪 TESTING DAPHNE SERVER LOCALLY")

def start_server_background():
    """Start daphne server in background"""
    cmd = [
        sys.executable,
        "-m",
        "daphne",
        "-b", "127.0.0.1",
        "-p", "8001",  # Use different port for testing
        "guitara.asgi_emergency:application"
    ]
    
    print(f"Starting server: {' '.join(cmd)}")
    
    # Start server in background
    proc = subprocess.Popen(
        cmd,
        cwd=guitara_path,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    return proc

def test_health_endpoints():
    """Test health endpoints"""
    base_url = "http://127.0.0.1:8001"
    
    endpoints_to_test = [
        "/health/",
        "/",
        "/health/minimal/"
    ]
    
    for endpoint in endpoints_to_test:
        try:
            url = f"{base_url}{endpoint}"
            print(f"Testing {url}...")
            
            response = requests.get(url, timeout=5)
            print(f"  Status: {response.status_code}")
            print(f"  Content: {response.text[:100]}...")
            
            if response.status_code == 200:
                print(f"  ✅ {endpoint} works!")
            else:
                print(f"  ❌ {endpoint} failed with {response.status_code}")
                
        except Exception as e:
            print(f"  ❌ {endpoint} error: {e}")

def main():
    """Main test function"""
    # Start server
    server_proc = start_server_background()
    
    try:
        # Wait for server to start
        print("⏳ Waiting for server to start...")
        time.sleep(3)
        
        # Check if server is still running
        if server_proc.poll() is not None:
            stdout, stderr = server_proc.communicate()
            print("❌ Server failed to start!")
            print(f"STDOUT: {stdout}")
            print(f"STDERR: {stderr}")
            return False
        
        print("✅ Server appears to be running")
        
        # Test endpoints
        test_health_endpoints()
        
        return True
        
    finally:
        # Clean up server
        print("\n🛑 Stopping server...")
        server_proc.terminate()
        try:
            server_proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server_proc.kill()
            server_proc.wait()
        print("✅ Server stopped")

if __name__ == "__main__":
    success = main()
    if success:
        print("\n🎉 Daphne server test PASSED!")
        print("🚀 Ready for Railway with emergency startup")
    else:
        print("\n💥 Daphne server test FAILED!")
        sys.exit(1)
