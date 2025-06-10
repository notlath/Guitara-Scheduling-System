#!/usr/bin/env python
"""
Test script to verify the fixes for SettingsDataPage errors:
1. 404 error for operators fetching from non-existent `/api/auth/users/` endpoint
2. 400 error with "row-level security policy" violation when registering in Supabase
"""

import os
import django
import json
import sys

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from django.test import Client, override_settings
from django.contrib.auth import get_user_model
from core.models import CustomUser


@override_settings(ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"])
def test_operator_endpoint():
    """Test the operator endpoint that was causing 404 errors"""
    print("=" * 60)
    print("TESTING OPERATOR ENDPOINT FIX")
    print("=" * 60)

    client = Client()

    # Test GET request to operator endpoint
    print("\n1. Testing GET /api/registration/register/operator/")
    response = client.get("/api/registration/register/operator/")
    print(f"   Status Code: {response.status_code}")

    if response.status_code == 200:
        print("   ✓ GET request successful - endpoint exists and responds")
        try:
            data = response.json()
            print(f"   ✓ Response is valid JSON with {len(data)} operators")
        except:
            print("   ⚠ Response is not JSON, but endpoint works")
    else:
        print(f"   ✗ GET request failed: {response.content.decode()}")
        return False

    return True


@override_settings(ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"])
def test_operator_registration_with_rls_handling():
    """Test operator registration with RLS error handling"""
    print("\n2. Testing POST /api/registration/register/operator/ with RLS handling")

    client = Client()

    test_data = {
        "first_name": "Test",
        "last_name": "Operator",
        "username": "test_operator_" + str(hash("test") % 10000),
        "email": f'test_operator_{hash("test") % 10000}@example.com',
    }

    print(f"   Test data: {test_data}")

    response = client.post("/api/registration/register/operator/", test_data)
    print(f"   Status Code: {response.status_code}")

    try:
        response_data = response.json()
        print(f"   Response: {json.dumps(response_data, indent=2)}")

        if response.status_code == 201:
            print("   ✓ Registration successful")
            if response_data.get("fallback"):
                print("   ✓ Local database fallback worked (RLS handling successful)")
            else:
                print("   ✓ Supabase registration worked")
            return True
        elif response.status_code == 400 and "already exists" in response_data.get(
            "error", ""
        ):
            print("   ✓ Duplicate handling works correctly")
            return True
        else:
            print(f"   ⚠ Unexpected response: {response_data}")
            return False

    except Exception as e:
        print(f"   ✗ Error parsing response: {e}")
        print(f"   Raw response: {response.content.decode()}")
        return False


@override_settings(ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"])
def test_old_endpoint_404():
    """Test that the old endpoint returns 404 as expected"""
    print("\n3. Testing old endpoint /api/auth/users/ returns 404")

    client = Client()
    response = client.get("/api/auth/users/")
    print(f"   Status Code: {response.status_code}")

    if response.status_code == 404:
        print("   ✓ Old endpoint correctly returns 404")
        return True
    else:
        print(f"   ⚠ Old endpoint returned {response.status_code} instead of 404")
        return False


@override_settings(ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"])
def test_therapist_rls_handling():
    """Test therapist registration RLS handling"""
    print("\n4. Testing therapist registration RLS handling")

    client = Client()

    test_data = {
        "first_name": "Test",
        "last_name": "Therapist",
        "username": "test_therapist_" + str(hash("therapist") % 10000),
        "email": f'test_therapist_{hash("therapist") % 10000}@example.com',
        "specialization": "Swedish Massage",
        "pressure": "medium",
    }

    print(f"   Test data: {test_data}")

    response = client.post("/api/registration/register/therapist/", test_data)
    print(f"   Status Code: {response.status_code}")

    try:
        response_data = response.json()

        if response.status_code == 201:
            print("   ✓ Therapist registration successful")
            if response_data.get("fallback"):
                print("   ✓ Local database fallback worked (RLS handling successful)")
            else:
                print("   ✓ Supabase registration worked")
            return True
        elif response.status_code == 400 and "already exists" in response_data.get(
            "error", ""
        ):
            print("   ✓ Duplicate handling works correctly")
            return True
        else:
            print(f"   ⚠ Unexpected response: {response_data}")
            return False

    except Exception as e:
        print(f"   ✗ Error parsing response: {e}")
        return False


@override_settings(ALLOWED_HOSTS=["testserver", "localhost", "127.0.0.1"])
def test_driver_rls_handling():
    """Test driver registration RLS handling"""
    print("\n5. Testing driver registration RLS handling")

    client = Client()

    test_data = {
        "first_name": "Test",
        "last_name": "Driver",
        "username": "test_driver_" + str(hash("driver") % 10000),
        "email": f'test_driver_{hash("driver") % 10000}@example.com',
    }

    print(f"   Test data: {test_data}")

    response = client.post("/api/registration/register/driver/", test_data)
    print(f"   Status Code: {response.status_code}")

    try:
        response_data = response.json()

        if response.status_code == 201:
            print("   ✓ Driver registration successful")
            if response_data.get("fallback"):
                print("   ✓ Local database fallback worked (RLS handling successful)")
            else:
                print("   ✓ Supabase registration worked")
            return True
        elif response.status_code == 400 and "already exists" in response_data.get(
            "error", ""
        ):
            print("   ✓ Duplicate handling works correctly")
            return True
        else:
            print(f"   ⚠ Unexpected response: {response_data}")
            return False

    except Exception as e:
        print(f"   ✗ Error parsing response: {e}")
        return False


def main():
    """Run all tests"""
    print("TESTING SETTINGSDATAPAGE ERROR FIXES")
    print("=" * 60)

    results = []

    # Run all tests
    results.append(("Operator Endpoint", test_operator_endpoint()))
    results.append(
        ("Operator Registration RLS", test_operator_registration_with_rls_handling())
    )
    results.append(("Old Endpoint 404", test_old_endpoint_404()))
    results.append(("Therapist RLS Handling", test_therapist_rls_handling()))
    results.append(("Driver RLS Handling", test_driver_rls_handling()))

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    passed = 0
    for test_name, result in results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{test_name:<30} {status}")
        if result:
            passed += 1

    print(f"\nPassed: {passed}/{len(results)} tests")

    if passed == len(results):
        print("\n🎉 ALL TESTS PASSED! SettingsDataPage errors should be fixed.")
    else:
        print(f"\n⚠ {len(results) - passed} tests failed. Some issues may remain.")

    return passed == len(results)


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
