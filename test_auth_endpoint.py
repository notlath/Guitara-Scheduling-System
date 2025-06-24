#!/usr/bin/env python3
"""
Test script to verify auth endpoints are working in production
"""

import requests
import json
import sys


def test_auth_endpoints():
    """Test the authentication endpoints on Railway"""

    # Your Railway production URL
    base_url = "https://charismatic-appreciation-production.up.railway.app"

    print(f"🔍 Testing authentication endpoints at {base_url}")

    # Test health check first
    try:
        print("\n1. Testing health endpoint...")
        response = requests.get(f"{base_url}/health/", timeout=10)
        print(f"   Health Status: {response.status_code}")
        if response.status_code == 200:
            print(f"   Response: {response.json()}")
        else:
            print(f"   Error: {response.text}")
    except Exception as e:
        print(f"   Health check failed: {e}")

    # Test auth login endpoint (should return method not allowed for GET)
    try:
        print("\n2. Testing auth/login/ endpoint (GET - should return 405)...")
        response = requests.get(f"{base_url}/api/auth/login/", timeout=10)
        print(f"   Status: {response.status_code}")
        if response.status_code == 405:
            print("   ✅ Endpoint exists but doesn't allow GET (expected)")
        elif response.status_code == 404:
            print("   ❌ Endpoint not found - URL routing issue")
        else:
            print(f"   Response: {response.text}")
    except Exception as e:
        print(f"   Login endpoint test failed: {e}")

    # Test auth login endpoint with POST (should return validation error)
    try:
        print(
            "\n3. Testing auth/login/ endpoint (POST - should return validation error)..."
        )
        response = requests.post(
            f"{base_url}/api/auth/login/",
            json={},  # Empty data should trigger validation error
            headers={"Content-Type": "application/json"},
            timeout=10,
        )
        print(f"   Status: {response.status_code}")
        if response.status_code in [400, 401]:
            print("   ✅ Endpoint exists and handles POST requests")
            try:
                print(f"   Response: {response.json()}")
            except:
                print(f"   Response: {response.text}")
        elif response.status_code == 404:
            print("   ❌ Endpoint not found - URL routing issue")
        else:
            print(f"   Unexpected status: {response.text}")
    except Exception as e:
        print(f"   Login POST test failed: {e}")

    # Test CORS headers
    try:
        print("\n4. Testing CORS headers...")
        response = requests.options(
            f"{base_url}/api/auth/login/",
            headers={
                "Origin": "https://guitara-scheduling-system-git-main-lathrells-projects.vercel.app",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "Content-Type,Authorization",
            },
            timeout=10,
        )
        print(f"   CORS preflight status: {response.status_code}")
        cors_headers = {
            k: v for k, v in response.headers.items() if "access-control" in k.lower()
        }
        if cors_headers:
            print("   CORS headers:")
            for header, value in cors_headers.items():
                print(f"     {header}: {value}")
        else:
            print("   ❌ No CORS headers found")
    except Exception as e:
        print(f"   CORS test failed: {e}")


if __name__ == "__main__":
    test_auth_endpoints()
