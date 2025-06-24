#!/usr/bin/env python3
"""
Debug Railway deployment by testing different URL patterns
"""

import subprocess
import sys

def test_curl(url, description):
    """Test URL with curl and show full response"""
    print(f"\n🔍 {description}")
    print(f"   URL: {url}")
    
    try:
        # Use curl to get detailed response
        result = subprocess.run([
            'curl', '-v', '-L', '--max-time', '10', url
        ], capture_output=True, text=True, timeout=15)
        
        print(f"   Exit code: {result.returncode}")
        if result.stdout:
            print(f"   Response body: {result.stdout}")
        if result.stderr:
            print(f"   Headers/Debug: {result.stderr}")
            
    except Exception as e:
        print(f"   ❌ Error: {e}")

def main():
    """Test Railway deployment URLs"""
    base_url = "https://charismatic-appreciation-production.up.railway.app"
    
    tests = [
        ("/health/", "Health check endpoint"),
        ("/", "Root endpoint"),
        ("/ping/", "Ping endpoint"),
        ("/healthcheck/", "Healthcheck endpoint"),
    ]
    
    print("🚀 Testing Railway deployment with detailed debugging...")
    
    for path, description in tests:
        test_curl(f"{base_url}{path}", description)
    
    print("\n✅ Debug test completed!")

if __name__ == "__main__":
    main()
