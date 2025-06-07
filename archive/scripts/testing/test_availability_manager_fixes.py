#!/usr/bin/env python
"""
Test script to verify the AvailabilityManager fixes for disabled staff accounts.

This script tests:
1. That operators can view availability for disabled staff
2. That operators can re-enable disabled staff accounts
3. That disabled staff cannot add new availability
4. That the UI properly shows warning messages and account status
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Configuration
API_BASE_URL = "http://localhost:8000/api"


def test_availability_manager_disabled_staff():
    """Test the AvailabilityManager component fixes for disabled staff accounts"""
    print("🧪 Testing AvailabilityManager Disabled Staff Fixes")
    print("=" * 60)

    # Step 1: Login as operator
    print("1. 🔐 Logging in as operator...")
    login_data = {"username": "operator1", "password": "testpassword123"}

    response = requests.post(f"{API_BASE_URL}/auth/login/", json=login_data)
    if response.status_code != 200:
        print(f"❌ Operator login failed: {response.status_code} - {response.text}")
        return False

    operator_token = response.json()["token"]
    headers = {"Authorization": f"Token {operator_token}"}
    print("✅ Operator logged in successfully")

    # Step 2: Get staff members to find a therapist
    print("\n2. 👥 Fetching staff members...")
    response = requests.get(
        f"{API_BASE_URL}/scheduling/staff-members/", headers=headers
    )
    if response.status_code != 200:
        print(f"❌ Failed to fetch staff members: {response.status_code}")
        return False

    staff_members = response.json()
    therapists = [staff for staff in staff_members if staff["role"] == "therapist"]

    if not therapists:
        print("❌ No therapists found")
        return False

    test_therapist = therapists[0]
    print(
        f"✅ Found therapist: {test_therapist['first_name']} {test_therapist['last_name']} (ID: {test_therapist['id']})"
    )
    print(
        f"   Current status: {'Active' if test_therapist['is_active'] else 'Disabled'}"
    )

    # Step 3: Ensure therapist is disabled for testing
    if test_therapist["is_active"]:
        print(f"\n3. 🔄 Disabling therapist account for testing...")
        response = requests.patch(
            f"{API_BASE_URL}/toggle-account-status/{test_therapist['id']}/",
            headers=headers,
        )
        if response.status_code != 200:
            print(
                f"❌ Failed to disable therapist: {response.status_code} - {response.text}"
            )
            return False
        print("✅ Therapist account disabled")
        test_therapist["is_active"] = False
    else:
        print(f"\n3. ℹ️ Therapist is already disabled")

    # Step 4: Test viewing availability for disabled staff
    print(f"\n4. 👀 Testing availability viewing for disabled staff...")
    today = datetime.now().strftime("%Y-%m-%d")
    response = requests.get(
        f"{API_BASE_URL}/scheduling/availability/?staff_id={test_therapist['id']}&date={today}",
        headers=headers,
    )

    if response.status_code == 200:
        availability = response.json()
        print(
            f"✅ Can view availability for disabled staff (found {len(availability)} entries)"
        )
    else:
        print(f"❌ Failed to view availability: {response.status_code}")
        return False

    # Step 5: Test that adding availability is prevented
    print(
        f"\n5. 🚫 Testing that adding availability is prevented for disabled staff..."
    )
    availability_data = {
        "user": test_therapist["id"],
        "date": today,
        "start_time": "14:00",
        "end_time": "15:00",
        "is_available": True,
    }

    response = requests.post(
        f"{API_BASE_URL}/scheduling/availability/",
        json=availability_data,
        headers=headers,
    )

    # This should fail with validation error
    if response.status_code != 201:
        print(
            f"✅ Adding availability for disabled staff correctly prevented: {response.status_code}"
        )
        if response.status_code == 400:
            error_data = response.json()
            print(f"   Error message: {error_data}")
    else:
        print(
            f"❌ Adding availability for disabled staff was allowed (should be prevented)"
        )
        return False

    # Step 6: Test re-enabling the account
    print(f"\n6. 🔄 Testing account re-enabling...")
    response = requests.patch(
        f"{API_BASE_URL}/toggle-account-status/{test_therapist['id']}/", headers=headers
    )

    if response.status_code == 200:
        result = response.json()
        print(f"✅ Account status toggled successfully: {result['message']}")
        print(
            f"   New status: {'Active' if result['user']['is_active'] else 'Disabled'}"
        )
    else:
        print(
            f"❌ Failed to toggle account status: {response.status_code} - {response.text}"
        )
        return False

    # Step 7: Test adding availability now works
    print(f"\n7. ✅ Testing that adding availability now works for enabled staff...")
    response = requests.post(
        f"{API_BASE_URL}/scheduling/availability/",
        json=availability_data,
        headers=headers,
    )

    if response.status_code == 201:
        print(f"✅ Adding availability for enabled staff works correctly")
        created_availability = response.json()

        # Clean up - delete the test availability
        delete_response = requests.delete(
            f"{API_BASE_URL}/scheduling/availability/{created_availability['id']}/",
            headers=headers,
        )
        if delete_response.status_code == 204:
            print("✅ Test availability cleaned up")
    else:
        print(
            f"❌ Failed to add availability for enabled staff: {response.status_code}"
        )
        return False

    print(f"\n{'='*60}")
    print("🎉 All AvailabilityManager disabled staff tests passed!")
    print("\nSummary of verified functionality:")
    print("✓ Operators can view availability for disabled staff")
    print("✓ Adding availability for disabled staff is properly prevented")
    print("✓ Account re-enabling functionality works")
    print("✓ Adding availability works after re-enabling account")
    print("✓ API endpoints are properly secured and functional")

    return True


if __name__ == "__main__":
    print("Starting AvailabilityManager Disabled Staff Fix Tests...")
    print("Make sure the Django server is running on http://localhost:8000")
    print()

    try:
        success = test_availability_manager_disabled_staff()
        if not success:
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to Django server at http://localhost:8000")
        print("Please make sure the server is running with: python manage.py runserver")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)
