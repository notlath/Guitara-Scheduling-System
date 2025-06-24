#!/usr/bin/env python3
"""
Test the health check endpoints locally to ensure they work correctly
"""
import sys
import os
import subprocess
import time
import requests
from pathlib import Path

# Add the guitara directory to the path
guitara_dir = Path(__file__).parent / "guitara"
sys.path.insert(0, str(guitara_dir))

# Change to guitara directory
os.chdir(guitara_dir)

# Set environment for testing
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings_railway")

def test_health_endpoints():
    """Test that health check endpoints respond correctly"""
    print("=== Testing Health Check Endpoints ===")
    
    health_endpoints = [
        "/health/",
        "/healthcheck/", 
        "/health-check/",
        "/ping/"
    ]
    
    base_url = "http://127.0.0.1:8000"
    
    for endpoint in health_endpoints:
        try:
            url = f"{base_url}{endpoint}"
            print(f"Testing {url}...")
            
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                print(f"✅ {endpoint} - Status: {response.status_code}")
                print(f"   Response: {response.json()}")
            else:
                print(f"❌ {endpoint} - Status: {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ {endpoint} - Error: {e}")
        except Exception as e:
            print(f"❌ {endpoint} - Unexpected error: {e}")
        
        print()

def start_test_server():
    """Start a test server for health check testing"""
    print("=== Starting Test Server ===")
    
    try:
        # Start server in background
        cmd = [
            sys.executable, "manage.py", "runserver", "127.0.0.1:8000", 
            "--settings=guitara.settings_railway"
        ]
        
        print(f"Starting: {' '.join(cmd)}")
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        
        # Wait for server to start
        print("Waiting for server to start...")
        time.sleep(5)
        
        # Test health endpoints
        test_health_endpoints()
        
        # Stop server
        process.terminate()
        process.wait()
        
        return True
        
    except Exception as e:
        print(f"❌ Server test failed: {e}")
        return False

if __name__ == "__main__":
    print("Health Check Endpoint Test")
    print("=" * 50)
    
    success = start_test_server()
    
    if success:
        print("✅ Health check endpoints test completed")
    else:
        print("❌ Health check endpoints test failed")
        sys.exit(1)
