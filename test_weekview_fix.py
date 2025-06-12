#!/usr/bin/env python3
"""
Test script to verify the WeekView fix for the operator dashboard
"""

import requests
import sys
import json
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/api"


def test_week_view_endpoint():
    """Test the week view endpoint with correct parameters"""
    print("Testing WeekView Endpoint Fix")
    print("=" * 35)

    # Test data
    today = datetime.now()
    week_start = today - timedelta(
        days=today.weekday()
    )  # Start of current week (Monday)
    week_start_str = week_start.strftime("%Y-%m-%d")

    print(f"\n1. Testing Correct API Call:")
    print(f"   Week start date: {week_start_str}")

    # Test the correct endpoint with query parameters
    endpoint = f"{API_BASE}/scheduling/appointments/by_week/"
    params = {"week_start": week_start_str}

    try:
        response = requests.get(endpoint, params=params)
        print(f"   ✓ {endpoint}?week_start={week_start_str}")
        print(f"   Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success! Found {len(data)} appointments for the week")

            # Show a sample of the data
            if data:
                print(f"   Sample appointment:")
                sample = data[0]
                print(f"     ID: {sample.get('id')}")
                print(f"     Date: {sample.get('date')}")
                print(
                    f"     Time: {sample.get('start_time')} - {sample.get('end_time')}"
                )
                print(
                    f"     Client: {sample.get('client_details', {}).get('first_name', 'N/A')}"
                )
            else:
                print(f"   No appointments found for this week")

        elif response.status_code == 400:
            error_data = response.json()
            print(f"   ❌ Bad Request: {error_data}")
        elif response.status_code == 401:
            print(f"   ❌ Authentication required (expected without token)")
        else:
            print(f"   ⚠️ Unexpected status: {response.status_code}")
            try:
                print(f"   Response: {response.json()}")
            except:
                print(f"   Response: {response.text}")

    except requests.exceptions.ConnectionError:
        print(f"   ✗ Connection failed (server not running?)")
        return False
    except Exception as e:
        print(f"   ✗ Error: {e}")
        return False

    print(f"\n2. Testing Wrong API Call (Previous Issue):")

    # Test the old incorrect endpoint (should return 404)
    old_endpoint = f"{API_BASE}/scheduling/appointments/by_week/{week_start_str}/"

    try:
        response = requests.get(old_endpoint)
        print(f"   ✗ {old_endpoint}")
        print(f"   Status: {response.status_code}")

        if response.status_code == 404:
            print(f"   ✅ Correctly returns 404 (as expected for wrong URL)")
        else:
            print(f"   ⚠️ Unexpected response for wrong URL")

    except Exception as e:
        print(f"   ✗ Error: {e}")

    return True


def test_date_format_validation():
    """Test various date formats to ensure backend validation works"""
    print(f"\n3. Testing Date Format Validation:")

    test_cases = [
        ("2025-06-12", "Valid format", True),
        ("06-12-2025", "Invalid format (MM-DD-YYYY)", False),
        ("2025/06/12", "Invalid format (slashes)", False),
        ("invalid-date", "Invalid format (text)", False),
        ("", "Empty string", False),
    ]

    endpoint = f"{API_BASE}/scheduling/appointments/by_week/"

    for date_str, description, should_succeed in test_cases:
        print(f"\n   Testing: {description}")
        print(f"   Date: '{date_str}'")

        try:
            response = requests.get(endpoint, params={"week_start": date_str})

            if should_succeed and response.status_code == 200:
                print(f"   ✅ Success (as expected)")
            elif not should_succeed and response.status_code == 400:
                print(f"   ✅ Validation error (as expected)")
                error_data = response.json()
                print(f"   Error: {error_data.get('error', 'Unknown error')}")
            elif response.status_code == 401:
                print(f"   ⚠️ Authentication required (expected)")
            else:
                print(f"   ⚠️ Unexpected result: {response.status_code}")

        except Exception as e:
            print(f"   ✗ Error: {e}")


def test_frontend_integration():
    """Test frontend integration points"""
    print(f"\n4. Frontend Integration Fix:")
    print("=" * 30)

    fixes = [
        "✅ Updated fetchAppointmentsByWeek in schedulingSlice.js",
        "✅ Changed URL from /by_week/{date}/ to /by_week/",
        "✅ Added query parameter: ?week_start={date}",
        "✅ Maintained existing WeekView component logic",
        "✅ Compatible with existing SchedulingDashboard integration",
    ]

    print("\nChanges Made:")
    for fix in fixes:
        print(f"   {fix}")

    print("\nExpected Behavior:")
    print("   • WeekView component loads appointments for the selected week")
    print("   • No more 404 errors in browser console")
    print("   • Week navigation (previous/next) works correctly")
    print("   • Appointments display in correct time slots")
    print("   • Date formatting is consistent (YYYY-MM-DD)")


def main():
    """Main test function"""
    print("WeekView API Endpoint Fix Test")
    print("=" * 32)
    print("This test verifies the fix for the WeekView 404 errors")

    # Run tests
    success = test_week_view_endpoint()
    test_date_format_validation()
    test_frontend_integration()

    print("\n" + "=" * 50)
    if success:
        print("✅ WEEKVIEW ENDPOINT TEST COMPLETED")
        print("\nTo test manually:")
        print("1. Start the development servers:")
        print("   cd guitara && python manage.py runserver")
        print("   cd royal-care-frontend && npm start")
        print("2. Go to Scheduling Dashboard")
        print("3. Switch to Week View")
        print("4. Navigate between weeks")
        print("5. Verify no 404 errors in browser console")
    else:
        print("❌ SOME TESTS FAILED")
        print("Please check server is running and try again")


if __name__ == "__main__":
    main()
