#!/usr/bin/env python
"""
Operator Dashboard Performance Test Script
Tests the optimized OperatorDashboard endpoints and measures performance improvements.
"""

import os
import sys
import django
import time
import json
import requests
from pathlib import Path


def test_optimized_endpoints():
    """Test the optimized endpoints without Django setup issues"""

    print("🚀 Testing Optimized Operator Dashboard Endpoints")
    print("=" * 60)

    # Base URL for API (assuming development server on 8001)
    base_url = "http://localhost:8001/api/scheduling/appointments"

    # Headers (you'll need to replace with actual token)
    headers = {
        "Authorization": "Token YOUR_TOKEN_HERE",
        "Content-Type": "application/json",
    }

    print("📋 Test Configuration:")
    print(f"   Base URL: {base_url}")
    print(f"   Headers: Authorization header configured")
    print()

    # Test 1: Check if server is running
    print("🔍 Test 1: Server Health Check")
    try:
        response = requests.get(f"{base_url}/", headers=headers, timeout=5)
        print(f"   ✅ Server is responding: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"   ❌ Server not responding: {str(e)}")
        print("   💡 Start the Django server with: python manage.py runserver 8001")
        return False

    # Test 2: Original appointments endpoint (baseline)
    print("\n📊 Test 2: Original Appointments Endpoint (Baseline)")
    start_time = time.time()
    try:
        response = requests.get(f"{base_url}/", headers=headers, timeout=30)
        end_time = time.time()

        print(f"   Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            response_time = end_time - start_time
            count = (
                len(data.get("results", data)) if isinstance(data, dict) else len(data)
            )
            data_size = len(response.content)

            print(f"   ⏱️  Response Time: {response_time:.2f}s")
            print(f"   📄 Total Records: {count}")
            print(f"   💾 Data Size: {data_size:,} bytes")

            # Performance baseline
            if response_time > 5:
                print(f"   ⚠️  SLOW: Response time > 5s indicates performance issue")
            elif response_time > 1:
                print(f"   ⚡ MODERATE: Response time could be improved")
            else:
                print(f"   🚀 FAST: Good response time")

        elif response.status_code == 401:
            print("   🔐 Authentication required - update token in script")
        else:
            print(f"   ❌ Error: {response.status_code}")
            print(f"   Details: {response.text[:200]}")

    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {str(e)}")

    # Test 3: Optimized operator dashboard endpoint
    print("\n📊 Test 3: Optimized Operator Dashboard Endpoint")
    start_time = time.time()
    try:
        response = requests.get(
            f"{base_url}/operator_dashboard/", headers=headers, timeout=30
        )
        end_time = time.time()

        print(f"   Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            response_time = end_time - start_time
            count = (
                len(data.get("results", data)) if isinstance(data, dict) else len(data)
            )
            data_size = len(response.content)

            print(f"   ⏱️  Response Time: {response_time:.2f}s")
            print(f"   📄 Actionable Records: {count}")
            print(f"   💾 Data Size: {data_size:,} bytes")

            # Check optimization success
            if response_time < 1:
                print(f"   🚀 OPTIMIZED: Excellent response time!")
            elif response_time < 2:
                print(f"   ⚡ IMPROVED: Good response time")
            else:
                print(f"   ⚠️  Still slow - check database indexes")

        elif response.status_code == 404:
            print("   ❌ Endpoint not found - optimization not deployed")
        elif response.status_code == 401:
            print("   🔐 Authentication required - update token in script")
        else:
            print(f"   ❌ Error: {response.status_code}")
            print(f"   Details: {response.text[:200]}")

    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {str(e)}")

    # Test 4: Dashboard stats endpoint
    print("\n📊 Test 4: Dashboard Stats Endpoint")
    start_time = time.time()
    try:
        response = requests.get(
            f"{base_url}/dashboard_stats/", headers=headers, timeout=10
        )
        end_time = time.time()

        print(f"   Status Code: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            response_time = end_time - start_time
            data_size = len(response.content)

            print(f"   ⏱️  Response Time: {response_time:.2f}s")
            print(f"   💾 Data Size: {data_size:,} bytes")
            print(f"   📊 Stats: {json.dumps(data, indent=4)}")

            if response_time < 0.5:
                print(f"   🚀 ULTRA FAST: Stats endpoint optimized!")

        elif response.status_code == 404:
            print("   ❌ Endpoint not found - optimization not deployed")
        elif response.status_code == 401:
            print("   🔐 Authentication required - update token in script")
        else:
            print(f"   ❌ Error: {response.status_code}")
            print(f"   Details: {response.text[:200]}")

    except requests.exceptions.RequestException as e:
        print(f"   ❌ Request failed: {str(e)}")

    # Summary and recommendations
    print("\n🎯 Performance Test Summary")
    print("=" * 60)
    print("✅ Testing completed!")
    print()
    print("📋 Next Steps:")
    print("1. If authentication errors → Update token in this script")
    print("2. If endpoints not found → Apply Django migrations and restart server")
    print("3. If still slow → Check database migration was applied")
    print("4. If optimized → Test with React frontend")
    print()
    print("🎯 Success Criteria:")
    print("- Operator dashboard endpoint: < 1s response time")
    print("- Dashboard stats endpoint: < 0.5s response time")
    print("- Reduced data size compared to original endpoint")

    return True


def get_authentication_token():
    """Helper to get authentication token"""
    print("\n🔐 Authentication Token Setup")
    print("=" * 40)
    print("To test authenticated endpoints, you need a valid token.")
    print()
    print("Option 1: Use Django shell to create a token:")
    print("   python manage.py shell")
    print("   from django.contrib.auth.models import User")
    print("   from rest_framework.authtoken.models import Token")
    print("   user = User.objects.first()  # or create one")
    print("   token = Token.objects.get_or_create(user=user)[0]")
    print("   print(token.key)")
    print()
    print("Option 2: Use Knox tokens if configured:")
    print("   Check your existing authentication system")
    print()
    print("Then update the 'YOUR_TOKEN_HERE' in this script with the actual token.")


if __name__ == "__main__":
    print("🚀 Operator Dashboard Performance Test")
    print("=" * 60)

    try:
        # Show authentication help first
        get_authentication_token()

        # Wait for user confirmation
        input("\nPress Enter when you have updated the token in the script...")

        # Run the tests
        success = test_optimized_endpoints()

        if success:
            print("\n🎉 Performance testing completed!")
        else:
            print("\n❌ Some tests failed - check server status")

    except KeyboardInterrupt:
        print("\n👋 Testing cancelled by user")
    except Exception as e:
        print(f"\n❌ Test failed with error: {str(e)}")
        import traceback

        traceback.print_exc()
