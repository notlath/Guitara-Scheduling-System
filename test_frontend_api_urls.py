#!/usr/bin/env python3
"""
Test script to verify all frontend API URLs are correctly configured for production.
This script checks that the frontend is making requests to the correct Railway backend URLs.
"""

import requests
import json


def test_production_api_endpoints():
    """Test that all critical API endpoints are accessible in production."""

    base_url = "https://charismatic-appreciation-production.up.railway.app"

    print("🔍 Testing Production API Endpoints")
    print(f"Base URL: {base_url}")
    print("-" * 50)

    # Test endpoints that the frontend will call
    endpoints_to_test = [
        {
            "name": "Health Check",
            "url": f"{base_url}/health/",
            "method": "GET",
            "expected_status": 200,
            "description": "Basic health check endpoint",
        },
        {
            "name": "Auth Login",
            "url": f"{base_url}/api/auth/login/",
            "method": "POST",
            "expected_status": 401,  # Should return 401 for invalid credentials
            "description": "Login endpoint (should exist and handle POST)",
            "data": {"username": "test", "password": "test"},
        },
        {
            "name": "Auth Registration Check",
            "url": f"{base_url}/api/auth/check-username/",
            "method": "POST",
            "expected_status": [400, 401],  # Either validation error or auth required
            "description": "Username check endpoint",
            "data": {"username": "test"},
        },
        {
            "name": "Scheduling Endpoints",
            "url": f"{base_url}/api/scheduling/appointments/",
            "method": "GET",
            "expected_status": 401,  # Should require authentication
            "description": "Appointments endpoint (should require auth)",
        },
        {
            "name": "Attendance Endpoints",
            "url": f"{base_url}/api/attendance/records/",
            "method": "GET",
            "expected_status": 401,  # Should require authentication
            "description": "Attendance records endpoint (should require auth)",
        },
    ]

    results = []

    for endpoint in endpoints_to_test:
        print(f"\n📍 Testing: {endpoint['name']}")
        print(f"   URL: {endpoint['url']}")
        print(f"   Expected: {endpoint['expected_status']}")

        try:
            if endpoint["method"] == "GET":
                response = requests.get(endpoint["url"], timeout=10)
            elif endpoint["method"] == "POST":
                response = requests.post(
                    endpoint["url"],
                    json=endpoint.get("data", {}),
                    headers={"Content-Type": "application/json"},
                    timeout=10,
                )

            # Check if status is expected
            expected = endpoint["expected_status"]
            if isinstance(expected, list):
                status_ok = response.status_code in expected
            else:
                status_ok = response.status_code == expected

            if status_ok:
                print(f"   ✅ Status: {response.status_code} (Expected)")
                results.append(
                    {
                        "endpoint": endpoint["name"],
                        "status": "PASS",
                        "code": response.status_code,
                    }
                )
            else:
                print(f"   ❌ Status: {response.status_code} (Expected: {expected})")
                results.append(
                    {
                        "endpoint": endpoint["name"],
                        "status": "FAIL",
                        "code": response.status_code,
                    }
                )

            # Try to show response content (if JSON)
            try:
                content = response.json()
                print(f"   Response: {json.dumps(content, indent=2)[:200]}...")
            except:
                print(f"   Response: {response.text[:100]}...")

        except requests.exceptions.RequestException as e:
            print(f"   ❌ Error: {e}")
            results.append(
                {"endpoint": endpoint["name"], "status": "ERROR", "error": str(e)}
            )

    # Summary
    print("\n" + "=" * 50)
    print("📊 SUMMARY")
    print("=" * 50)

    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    errors = sum(1 for r in results if r["status"] == "ERROR")

    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"⚠️  Errors: {errors}")

    if failed == 0 and errors == 0:
        print("\n🎉 All API endpoints are correctly configured!")
        print("Frontend should now be able to connect to the backend in production.")
    else:
        print("\n⚠️  Some endpoints had issues. Check the details above.")

    return results


if __name__ == "__main__":
    test_production_api_endpoints()
