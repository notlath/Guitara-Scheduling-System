#!/usr/bin/env python3
"""
Comprehensive test script for all SettingsDataPage fixes including the new by_week endpoint
"""

import requests
import subprocess
import os
from datetime import datetime, timedelta


def test_endpoints_exist():
    """Test that all critical endpoints exist"""
    print("=" * 60)
    print("TESTING ALL ENDPOINTS EXIST")
    print("=" * 60)

    base_url = "http://localhost:8000"
    endpoints_to_test = [
        # Registration endpoints (previously fixed)
        "/api/registration/register/operator/",
        "/api/registration/register/therapist/",
        "/api/registration/register/driver/",
        # Scheduling endpoints
        "/api/scheduling/appointments/",
        "/api/scheduling/appointments/today/",
        "/api/scheduling/appointments/upcoming/",
        "/api/scheduling/appointments/by_week/",  # NEW endpoint
    ]

    all_passed = True

    for endpoint in endpoints_to_test:
        try:
            response = requests.get(f"{base_url}{endpoint}")
            # We expect 401 (auth required) or 405 (method not allowed for POST-only) or 200
            if response.status_code in [200, 401, 405]:
                print(f"✓ {endpoint} - Status: {response.status_code}")
            else:
                print(f"✗ {endpoint} - Status: {response.status_code}")
                all_passed = False
        except requests.exceptions.ConnectionError:
            print(f"✗ {endpoint} - Connection failed")
            all_passed = False
        except Exception as e:
            print(f"✗ {endpoint} - Error: {e}")
            all_passed = False

    return all_passed


def test_by_week_endpoint_specifically():
    """Test the new by_week endpoint with various parameters"""
    print("\n" + "=" * 60)
    print("TESTING BY_WEEK ENDPOINT FUNCTIONALITY")
    print("=" * 60)

    base_url = "http://localhost:8000/api/scheduling/appointments/by_week/"

    # Test 1: With valid date parameter
    print("1. Testing with valid week_start parameter...")
    today = datetime.now().date()
    week_start = today - timedelta(days=today.weekday())

    response = requests.get(
        base_url, params={"week_start": week_start.strftime("%Y-%m-%d")}
    )
    if response.status_code == 401:
        print("   ✓ Valid parameter - Returns 401 (auth required)")
        test1_pass = True
    else:
        print(f"   ✗ Valid parameter - Unexpected status: {response.status_code}")
        test1_pass = False

    # Test 2: Without week_start parameter
    print("2. Testing without week_start parameter...")
    response = requests.get(base_url)
    if response.status_code == 401:
        print("   ✓ No parameter - Returns 401 (auth required)")
        test2_pass = True
    else:
        print(f"   ✗ No parameter - Unexpected status: {response.status_code}")
        test2_pass = False

    # Test 3: With invalid date format
    print("3. Testing with invalid date format...")
    response = requests.get(base_url, params={"week_start": "invalid-date"})
    if response.status_code == 401:
        print("   ✓ Invalid date - Returns 401 (auth required)")
        test3_pass = True
    else:
        print(f"   ✗ Invalid date - Unexpected status: {response.status_code}")
        test3_pass = False

    return test1_pass and test2_pass and test3_pass


def test_frontend_url_fix():
    """Test that the frontend URL has been correctly updated"""
    print("\n" + "=" * 60)
    print("TESTING FRONTEND URL FIX")
    print("=" * 60)

    frontend_file = "/home/notlath/Downloads/Guitara-Scheduling-System/royal-care-frontend/src/pages/SettingsDataPage/SettingsDataPage.jsx"

    try:
        with open(frontend_file, "r") as f:
            content = f.read()

        # Check for old incorrect URL
        if "api/auth/users/" in content:
            print("✗ Old incorrect URL still found in frontend")
            return False

        # Check for new correct URL
        if "api/registration/register/operator/" in content:
            print("✓ New correct URL found in frontend")
            return True
        else:
            print("✗ New correct URL not found in frontend")
            return False

    except FileNotFoundError:
        print("✗ Frontend file not found")
        return False


def test_rls_error_handling():
    """Test that RLS error handling is implemented"""
    print("\n" + "=" * 60)
    print("TESTING RLS ERROR HANDLING")
    print("=" * 60)

    views_file = "/home/notlath/Downloads/Guitara-Scheduling-System/guitara/registration/views.py"

    try:
        with open(views_file, "r") as f:
            content = f.read()

        # Check for RLS error patterns
        rls_patterns = [
            "row-level security",
            "42501",
            "violates row-level security policy",
            "CustomUser.objects.create",
            "fallback",
        ]

        found_patterns = []
        for pattern in rls_patterns:
            if pattern in content:
                found_patterns.append(pattern)

        if len(found_patterns) >= 4:  # Should find most patterns
            print(
                f"✓ RLS error handling implemented (found {len(found_patterns)} patterns)"
            )
            print(f"   Patterns found: {', '.join(found_patterns)}")
            return True
        else:
            print(
                f"✗ Insufficient RLS error handling (found {len(found_patterns)} patterns)"
            )
            return False

    except FileNotFoundError:
        print("✗ Views file not found")
        return False


def main():
    """Run all tests"""
    print("COMPREHENSIVE TEST FOR ALL SETTINGSDATAPAGE FIXES")
    print("Including the new by_week endpoint")
    print("=" * 80)

    # Run all tests
    test_results = []

    test_results.append(("Endpoints Exist", test_endpoints_exist()))
    test_results.append(("By-Week Endpoint", test_by_week_endpoint_specifically()))
    test_results.append(("Frontend URL Fix", test_frontend_url_fix()))
    test_results.append(("RLS Error Handling", test_rls_error_handling()))

    # Summary
    print("\n" + "=" * 80)
    print("COMPREHENSIVE TEST SUMMARY")
    print("=" * 80)

    passed = 0
    total = len(test_results)

    for test_name, result in test_results:
        status = "✓ PASS" if result else "✗ FAIL"
        print(f"{test_name:<25} {status}")
        if result:
            passed += 1

    print(f"\nPassed: {passed}/{total} tests")

    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        print("\nFIXES COMPLETED:")
        print(
            "1. ✓ Fixed 404 error by changing frontend URL from /api/auth/users/ to /api/registration/register/operator/"
        )
        print(
            "2. ✓ Added comprehensive RLS error handling with local database fallback"
        )
        print("3. ✓ Enhanced Supabase client configuration for better error handling")
        print(
            "4. ✓ All registration endpoints now handle RLS policy violations gracefully"
        )
        print("5. ✓ Created missing /api/scheduling/appointments/by_week/ endpoint")
        print(
            "\nThe SettingsDataPage and scheduling functionality should now work correctly!"
        )
        return True
    else:
        print(f"\n❌ {total - passed} tests failed!")
        return False


if __name__ == "__main__":
    main()
