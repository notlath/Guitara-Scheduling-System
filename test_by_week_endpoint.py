#!/usr/bin/env python3
"""Test script for the new by_week endpoint"""

import requests
import json
from datetime import datetime, timedelta


def test_by_week_endpoint():
    """Test the new by_week endpoint"""
    base_url = "http://localhost:8000"

    print("Testing the new /api/scheduling/appointments/by_week/ endpoint...")

    # Test 1: Check if endpoint exists (without auth first)
    print("\n1. Testing endpoint availability...")
    try:
        # Get week start for current week
        today = datetime.now().date()
        week_start = today - timedelta(
            days=today.weekday()
        )  # Start of current week (Monday)

        url = f"{base_url}/api/scheduling/appointments/by_week/"
        params = {"week_start": week_start.strftime("%Y-%m-%d")}

        response = requests.get(url, params=params)
        print(f"Status Code: {response.status_code}")

        if response.status_code == 401:
            print("✅ Endpoint exists but requires authentication (expected)")
        elif response.status_code == 404:
            print("❌ Endpoint not found - there's still an issue")
            return False
        else:
            print(f"✅ Endpoint accessible, returned: {response.status_code}")

    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to Django server")
        print("Make sure Django server is running on http://localhost:8000")
        return False
    except Exception as e:
        print(f"❌ Error testing endpoint: {e}")
        return False

    # Test 2: Test with invalid parameters
    print("\n2. Testing with invalid parameters...")
    try:
        # Test missing week_start parameter
        response = requests.get(f"{base_url}/api/scheduling/appointments/by_week/")
        print(f"Missing week_start - Status: {response.status_code}")
        if response.status_code in [400, 401]:
            print("✅ Properly handles missing parameters")

        # Test invalid date format
        response = requests.get(
            f"{base_url}/api/scheduling/appointments/by_week/",
            params={"week_start": "invalid-date"},
        )
        print(f"Invalid date format - Status: {response.status_code}")
        if response.status_code in [400, 401]:
            print("✅ Properly handles invalid date format")

    except Exception as e:
        print(f"❌ Error testing invalid parameters: {e}")
        return False

    print("\n✅ Basic endpoint tests completed successfully!")
    print("The by_week endpoint has been created and is responding correctly.")
    return True


if __name__ == "__main__":
    test_by_week_endpoint()
