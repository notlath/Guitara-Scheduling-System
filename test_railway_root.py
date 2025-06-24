#!/usr/bin/env python3
"""
Test script to verify Railway deployment endpoints
"""
import requests
import json

def test_endpoint(url, expected_status=200):
    """Test a single endpoint"""
    try:
        print(f"\n🔍 Testing: {url}")
        response = requests.get(url, timeout=10)
        print(f"   Status: {response.status_code}")
        print(f"   Headers: {dict(response.headers)}")
        
        if response.headers.get('content-type', '').startswith('application/json'):
            try:
                data = response.json()
                print(f"   Response: {json.dumps(data, indent=2)}")
            except:
                print(f"   Response: {response.text}")
        else:
            print(f"   Response: {response.text}")
            
        return response.status_code == expected_status
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return False

def main():
    """Test all endpoints"""
    base_url = "https://charismatic-appreciation-production.up.railway.app"
    
    endpoints = [
        ("/health/", 200),
        ("/healthcheck/", 200), 
        ("/ping/", 200),
        ("/", 200),  # This should work now
    ]
    
    print("🚀 Testing Railway deployment endpoints...")
    
    results = []
    for endpoint, expected_status in endpoints:
        url = f"{base_url}{endpoint}"
        success = test_endpoint(url, expected_status)
        results.append((endpoint, success))
    
    print("\n📊 Results:")
    for endpoint, success in results:
        status = "✅" if success else "❌"
        print(f"   {status} {endpoint}")
    
    all_passed = all(success for _, success in results)
    print(f"\n🎯 Overall: {'✅ All tests passed!' if all_passed else '❌ Some tests failed'}")

if __name__ == "__main__":
    main()
