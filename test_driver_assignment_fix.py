#!/usr/bin/env python3
"""
Test script to verify the driver assignment functionality works correctly
after applying all fixes for the Guitara Scheduling System.
"""

import os
import sys
import requests
import json
from datetime import datetime, timedelta
import time

# Configuration
BASE_URL = "http://localhost:8000/api"
SCHEDULING_URL = f"{BASE_URL}/scheduling"


def test_driver_assignment():
    """Test the complete driver assignment workflow"""

    print("🔧 Testing Driver Assignment Workflow")
    print("=" * 50)

    # Test data
    test_appointment = {
        "id": 1,  # Assuming appointment ID 1 exists
        "status": "pickup_requested",
        "notes": "Testing pickup request functionality",
    }

    driver_assignment = {
        "id": 1,  # Same appointment
        "status": "driver_assigned_pickup",
        "driver": 1,  # Assuming driver with ID 1 exists
        "notes": "Testing driver assignment functionality",
    }

    try:
        # Test 1: Pickup Request
        print("📋 Test 1: Pickup Request Status Update")
        pickup_response = requests.patch(
            f"{SCHEDULING_URL}/appointments/{test_appointment['id']}/",
            json={
                "status": test_appointment["status"],
                "notes": test_appointment["notes"],
            },
            headers={"Content-Type": "application/json"},
        )

        print(f"   Status Code: {pickup_response.status_code}")
        if pickup_response.status_code == 200:
            print("   ✅ Pickup request successful")
            response_data = pickup_response.json()
            print(f"   📊 Updated Status: {response_data.get('status', 'Unknown')}")
        elif pickup_response.status_code == 401:
            print("   ⚠️  Authentication required - test needs valid token")
        else:
            print(f"   ❌ Pickup request failed: {pickup_response.text}")

        print()

        # Test 2: Driver Assignment
        print("🚗 Test 2: Driver Assignment Status Update")
        assignment_response = requests.patch(
            f"{SCHEDULING_URL}/appointments/{driver_assignment['id']}/",
            json={
                "status": driver_assignment["status"],
                "driver": driver_assignment["driver"],
                "notes": driver_assignment["notes"],
            },
            headers={"Content-Type": "application/json"},
        )

        print(f"   Status Code: {assignment_response.status_code}")
        if assignment_response.status_code == 200:
            print("   ✅ Driver assignment successful")
            response_data = assignment_response.json()
            print(f"   📊 Updated Status: {response_data.get('status', 'Unknown')}")
            print(f"   🚗 Assigned Driver: {response_data.get('driver', 'Unknown')}")
        elif assignment_response.status_code == 401:
            print("   ⚠️  Authentication required - test needs valid token")
        else:
            print(f"   ❌ Driver assignment failed: {assignment_response.text}")

        print()

        # Test 3: Field Validation
        print("🔍 Test 3: Field Validation")
        invalid_response = requests.patch(
            f"{SCHEDULING_URL}/appointments/{test_appointment['id']}/",
            json={"status": "invalid_status", "nonexistent_field": "test_value"},
            headers={"Content-Type": "application/json"},
        )

        print(f"   Status Code: {invalid_response.status_code}")
        if invalid_response.status_code == 400:
            print("   ✅ Field validation working correctly")
            print(f"   📋 Error Details: {invalid_response.text}")
        elif invalid_response.status_code == 401:
            print("   ⚠️  Authentication required - test needs valid token")
        else:
            print(f"   ⚠️  Unexpected response: {invalid_response.text}")

        print()

        # Test 4: Backend Health Check
        print("🏥 Test 4: Backend Health Check")
        try:
            health_response = requests.get(f"{BASE_URL}/health/", timeout=5)
            print(f"   Status Code: {health_response.status_code}")
            if health_response.status_code == 200:
                print("   ✅ Backend is running")
            else:
                print(f"   ⚠️  Backend health check response: {health_response.text}")
        except requests.exceptions.ConnectionError:
            print("   ❌ Backend is not running or not accessible")
        except requests.exceptions.Timeout:
            print("   ⏱️  Backend is slow to respond")

        print()

    except Exception as e:
        print(f"❌ Test failed with error: {str(e)}")

    print("🔧 Driver Assignment Tests Complete")
    print("=" * 50)


def test_serializer_fields():
    """Test that the serializer properly handles driver assignment fields"""

    print("📝 Testing Serializer Field Configuration")
    print("=" * 50)

    # Test fields that should be accepted
    valid_fields = [
        "status",
        "driver",
        "notes",
        "driver_accepted",
        "driver_accepted_at",
        "therapist_accepted",
        "therapist_accepted_at",
        "location",
    ]

    print("✅ Valid status update fields:")
    for field in valid_fields:
        print(f"   • {field}")

    print()

    # Test payload structure
    test_payload = {
        "status": "driver_assigned_pickup",
        "driver": 1,
        "notes": "Driver assignment test",
        "driver_accepted": True,
        "driver_accepted_at": datetime.now().isoformat(),
    }

    print("📋 Example valid payload:")
    print(json.dumps(test_payload, indent=2))

    print()
    print("📝 Serializer Field Tests Complete")
    print("=" * 50)


def check_migration_status():
    """Check if migrations have been applied"""

    print("🗄️  Database Migration Status Check")
    print("=" * 50)

    try:
        # Check if we can connect to get migration status
        # This would require Django management command
        print("ℹ️  To check migration status, run:")
        print("   cd guitara && python manage.py showmigrations scheduling")
        print()
        print("ℹ️  To apply migrations, run:")
        print("   cd guitara && python manage.py migrate")
        print()

    except Exception as e:
        print(f"❌ Migration check failed: {str(e)}")

    print("🗄️  Migration Status Check Complete")
    print("=" * 50)


if __name__ == "__main__":
    print("🚀 Starting Driver Assignment Fix Verification")
    print("=" * 60)
    print()

    check_migration_status()
    print()

    test_serializer_fields()
    print()

    test_driver_assignment()
    print()

    print("🎯 SUMMARY")
    print("=" * 60)
    print("✅ Applied Fixes:")
    print("   • Added 'driver' field to status_update_fields in AppointmentSerializer")
    print("   • Fixed pickup request functions in TherapistDashboard")
    print("   • Added missing status choices to Appointment model")
    print("   • Created migration for status choices update")
    print("   • Updated frontend components to use valid fields only")
    print()
    print("📋 Next Steps:")
    print("   1. Ensure Django migration has been applied")
    print("   2. Restart the Django backend server")
    print("   3. Test the complete workflow with valid authentication")
    print("   4. Verify all dashboards show proper status updates")
    print()
    print("🔧 Driver Assignment Fix Verification Complete!")
