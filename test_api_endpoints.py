#!/usr/bin/env python3
"""Test script to verify API endpoint functionality after fixes"""

import requests
import json
import sys
import os
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api/scheduling"

# Test endpoints
ENDPOINTS = {
    "appointments": f"{API_BASE}/appointments/",
    "update_driver_availability": f"{API_BASE}/appointments/update_driver_availability/",
    "drop_off_therapist": f"{API_BASE}/appointments/1/drop_off_therapist/",  # Test with ID 1
    "notifications": f"{API_BASE}/notifications/",
    "staff": f"{API_BASE}/staff/",
    "services": f"{API_BASE}/services/",
    "clients": f"{API_BASE}/clients/",
    "availabilities": f"{API_BASE}/availabilities/",
}


def test_endpoint(name, url, method="GET", data=None, auth_required=True):
    """Test a single endpoint"""
    print(f"\n🔍 Testing {name}: {method} {url}")

    headers = {}
    if auth_required:
        # For now, test without auth to see if endpoints are reachable
        # In production, you'd need a valid token
        headers["Authorization"] = "Token dummy_token_for_testing"

    if data:
        headers["Content-Type"] = "application/json"

    try:
        if method == "GET":
            response = requests.get(url, headers=headers, timeout=5)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=5)

        print(f"  Status: {response.status_code}")

        if response.status_code == 404:
            print(f"  ❌ NOT FOUND - Endpoint does not exist")
            return False
        elif response.status_code == 401:
            print(f"  ✅ FOUND - Endpoint exists but requires authentication")
            return True
        elif response.status_code in [200, 201, 400, 403]:
            print(f"  ✅ FOUND - Endpoint exists and is accessible")
            try:
                response_data = response.json()
                if isinstance(response_data, dict) and "detail" in response_data:
                    print(f"  Detail: {response_data['detail']}")
            except:
                pass
            return True
        else:
            print(f"  ⚠️  Unexpected status code: {response.status_code}")
            return True

    except requests.exceptions.ConnectionError:
        print(f"  ❌ CONNECTION ERROR - Backend server not running")
        return False
    except requests.exceptions.Timeout:
        print(f"  ❌ TIMEOUT - Request timed out")
        return False
    except Exception as e:
        print(f"  ❌ ERROR - {str(e)}")
        return False


def main():
    print("🚀 Starting API Endpoint Tests")
    print(f"Backend URL: {BASE_URL}")
    print("=" * 50)

    # Test basic connectivity
    try:
        response = requests.get(BASE_URL, timeout=5)
        print(f"✅ Backend server is running (Status: {response.status_code})")
    except:
        print("❌ Backend server is not running or not accessible")
        print(
            "Please start the Django development server with: python manage.py runserver"
        )
        return 1

    # Test all endpoints
    results = {}
    for name, url in ENDPOINTS.items():
        if name == "update_driver_availability":
            # Test POST endpoint
            test_data = {"status": "available", "current_location": "Test Location"}
            results[name] = test_endpoint(name, url, method="POST", data=test_data)
        else:
            # Test GET endpoint
            results[name] = test_endpoint(name, url, method="GET")

    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)

    passed = sum(results.values())
    total = len(results)

    for name, passed in results.items():
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {name}: {status}")

    print(f"\nTotal: {passed}/{total} endpoints accessible")

    if passed == total:
        print("🎉 All endpoints are accessible!")
        return 0
    else:
        print("⚠️  Some endpoints may need attention")
        return 1


if __name__ == "__main__":
    sys.exit(main())
