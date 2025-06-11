#!/usr/bin/env python3
"""
FIFO Integration Test
Verifies that the FIFO system is working end-to-end after fixing API endpoints.
"""

import requests
import json
import sys
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api"


def test_login_and_get_token():
    """Test login and get authentication token"""
    login_url = f"{BASE_URL}/auth/login/"
    login_data = {"username": "operator@royal.com", "password": "password123"}

    try:
        response = requests.post(login_url, json=login_data)
        if response.status_code == 200:
            token = response.json().get("token")
            print(f"✅ Login successful, token obtained")
            return token
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Login error: {e}")
        return None


def test_staff_endpoint(token):
    """Test the staff endpoint that was causing 404 errors"""
    headers = {"Authorization": f"Token {token}"}
    staff_url = f"{BASE_URL}/scheduling/staff/"

    try:
        response = requests.get(staff_url, headers=headers)
        if response.status_code == 200:
            staff_data = response.json()
            print(f"✅ Staff endpoint working: {len(staff_data)} staff members found")
            return staff_data
        else:
            print(f"❌ Staff endpoint failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"❌ Staff endpoint error: {e}")
        return None


def test_notifications_endpoint(token):
    """Test the notifications endpoint that was causing 500 errors"""
    headers = {"Authorization": f"Token {token}"}
    notifications_url = f"{BASE_URL}/scheduling/notifications/"

    try:
        response = requests.get(notifications_url, headers=headers)
        if response.status_code == 200:
            notifications_data = response.json()
            print(
                f"✅ Notifications endpoint working: {len(notifications_data)} notifications found"
            )
            return notifications_data
        else:
            print(
                f"❌ Notifications endpoint failed: {response.status_code} - {response.text}"
            )
            return None
    except Exception as e:
        print(f"❌ Notifications endpoint error: {e}")
        return None


def test_appointments_endpoint(token):
    """Test appointments endpoint to verify FIFO system"""
    headers = {"Authorization": f"Token {token}"}
    appointments_url = f"{BASE_URL}/scheduling/appointments/"

    try:
        response = requests.get(appointments_url, headers=headers)
        if response.status_code == 200:
            appointments_data = response.json()
            print(
                f"✅ Appointments endpoint working: {len(appointments_data)} appointments found"
            )
            return appointments_data
        else:
            print(
                f"❌ Appointments endpoint failed: {response.status_code} - {response.text}"
            )
            return None
    except Exception as e:
        print(f"❌ Appointments endpoint error: {e}")
        return None


def test_driver_availability_endpoint(token, driver_id=37):
    """Test the FIFO driver availability endpoint"""
    headers = {"Authorization": f"Token {token}"}
    availability_url = f"{BASE_URL}/scheduling/update-driver-availability/"

    availability_data = {"driver_id": driver_id, "is_available": True}

    try:
        response = requests.post(
            availability_url, json=availability_data, headers=headers
        )
        if response.status_code == 200:
            result = response.json()
            print(f"✅ FIFO availability endpoint working: {result}")
            return result
        else:
            print(
                f"❌ FIFO availability endpoint failed: {response.status_code} - {response.text}"
            )
            return None
    except Exception as e:
        print(f"❌ FIFO availability endpoint error: {e}")
        return None


def main():
    """Main test function"""
    print("🔍 Testing FIFO Integration After API Endpoint Fixes")
    print("=" * 60)

    # Test 1: Login
    print("\n1. Testing login...")
    token = test_login_and_get_token()
    if not token:
        print("❌ Cannot proceed without valid token")
        sys.exit(1)

    # Test 2: Staff endpoint (was causing 404)
    print("\n2. Testing staff endpoint...")
    staff_data = test_staff_endpoint(token)

    # Test 3: Notifications endpoint (was causing 500)
    print("\n3. Testing notifications endpoint...")
    notifications_data = test_notifications_endpoint(token)

    # Test 4: Appointments endpoint
    print("\n4. Testing appointments endpoint...")
    appointments_data = test_appointments_endpoint(token)

    # Test 5: FIFO availability endpoint
    print("\n5. Testing FIFO driver availability endpoint...")
    availability_result = test_driver_availability_endpoint(token)

    # Summary
    print("\n" + "=" * 60)
    print("📊 FIFO Integration Test Summary:")
    print(f"  • Login: {'✅ PASS' if token else '❌ FAIL'}")
    print(f"  • Staff Endpoint: {'✅ PASS' if staff_data else '❌ FAIL'}")
    print(
        f"  • Notifications Endpoint: {'✅ PASS' if notifications_data else '❌ FAIL'}"
    )
    print(f"  • Appointments Endpoint: {'✅ PASS' if appointments_data else '❌ FAIL'}")
    print(f"  • FIFO Availability: {'✅ PASS' if availability_result else '❌ FAIL'}")

    all_passed = all(
        [token, staff_data, notifications_data, appointments_data, availability_result]
    )

    if all_passed:
        print("\n🎉 All tests PASSED! FIFO system is ready for manual testing.")
        print("🚀 You can now proceed with end-to-end FIFO workflow testing.")
    else:
        print("\n⚠️  Some tests FAILED. Please check the issues above.")

    return all_passed


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
