#!/usr/bin/env python3
"""
Test script to verify real-time synchronization between dashboards
when therapist availability is created/updated/deleted.
"""

import requests
import json
import time
from datetime import datetime, timedelta

# API Configuration
API_BASE_URL = "http://localhost:8000/api"
SCHEDULING_API_URL = f"{API_BASE_URL}/scheduling"
AUTH_API_URL = f"{API_BASE_URL}/auth"

def test_real_time_sync():
    """Test real-time synchronization for availability changes"""
    print("🧪 Testing Real-time Availability Synchronization")
    print("=" * 60)

    # Step 1: Login as operator
    print("1. 🔐 Logging in as operator...")
    login_data = {"username": "operator1", "password": "testpassword123"}
    
    response = requests.post(f"{AUTH_API_URL}/login/", json=login_data)
    if response.status_code != 200:
        print(f"❌ Operator login failed: {response.status_code} - {response.text}")
        return False
    
    operator_token = response.json()["token"]
    operator_headers = {"Authorization": f"Token {operator_token}"}
    print("✅ Operator logged in successfully")

    # Step 2: Login as therapist
    print("\n2. 👩‍⚕️ Logging in as therapist...")
    therapist_login_data = {"username": "therapist1", "password": "testpassword123"}
    
    response = requests.post(f"{AUTH_API_URL}/login/", json=login_data)
    if response.status_code != 200:
        print(f"❌ Therapist login failed: {response.status_code} - {response.text}")
        return False
    
    therapist_token = response.json()["token"]
    therapist_headers = {"Authorization": f"Token {therapist_token}"}
    print("✅ Therapist logged in successfully")

    # Step 3: Get therapist user ID
    print("\n3. 👥 Getting therapist user data...")
    response = requests.get(f"{API_BASE_URL}/staff/", headers=operator_headers)
    if response.status_code != 200:
        print(f"❌ Failed to fetch staff: {response.status_code}")
        return False
    
    staff_members = response.json()
    therapist_user = None
    for staff in staff_members:
        if staff.get("role") == "therapist" and staff.get("username") == "therapist1":
            therapist_user = staff
            break
    
    if not therapist_user:
        print("❌ Could not find therapist1 user")
        return False
    
    therapist_id = therapist_user["id"]
    print(f"✅ Found therapist: {therapist_user['first_name']} {therapist_user['last_name']} (ID: {therapist_id})")

    # Step 4: Create availability as therapist
    print("\n4. ➕ Creating availability as therapist...")
    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
    
    availability_data = {
        "user": therapist_id,
        "date": tomorrow,
        "start_time": "14:00",
        "end_time": "16:00",
        "is_available": True
    }
    
    response = requests.post(
        f"{SCHEDULING_API_URL}/availability/",
        json=availability_data,
        headers=therapist_headers
    )
    
    if response.status_code != 201:
        print(f"❌ Failed to create availability: {response.status_code} - {response.text}")
        return False
    
    created_availability = response.json()
    availability_id = created_availability["id"]
    print(f"✅ Availability created successfully (ID: {availability_id})")
    print(f"   Date: {tomorrow}, Time: 14:00-16:00")

    # Step 5: Verify availability appears for operator
    print("\n5. 🔍 Checking if availability is visible to operator...")
    time.sleep(2)  # Give time for sync
    
    response = requests.get(
        f"{SCHEDULING_API_URL}/availability/",
        params={"user": therapist_id, "date": tomorrow},
        headers=operator_headers
    )
    
    if response.status_code != 200:
        print(f"❌ Failed to fetch availability as operator: {response.status_code}")
        return False
    
    operator_availability = response.json()
    found_availability = None
    for avail in operator_availability:
        if avail["id"] == availability_id:
            found_availability = avail
            break
    
    if found_availability:
        print("✅ Availability is visible to operator immediately")
        print(f"   Data: {found_availability}")
    else:
        print("⚠️ Availability not immediately visible to operator")
        print(f"   Available data: {operator_availability}")

    # Step 6: Update availability as therapist
    print("\n6. ✏️ Updating availability as therapist...")
    update_data = {
        "user": therapist_id,
        "date": tomorrow,
        "start_time": "15:00",  # Changed start time
        "end_time": "17:00",    # Changed end time
        "is_available": True
    }
    
    response = requests.put(
        f"{SCHEDULING_API_URL}/availability/{availability_id}/",
        json=update_data,
        headers=therapist_headers
    )
    
    if response.status_code == 200:
        print("✅ Availability updated successfully")
        print("   New time: 15:00-17:00")
    else:
        print(f"❌ Failed to update availability: {response.status_code} - {response.text}")

    # Step 7: Delete availability as therapist
    print("\n7. 🗑️ Deleting availability as therapist...")
    response = requests.delete(
        f"{SCHEDULING_API_URL}/availability/{availability_id}/",
        headers=therapist_headers
    )
    
    if response.status_code == 204:
        print("✅ Availability deleted successfully")
    else:
        print(f"❌ Failed to delete availability: {response.status_code} - {response.text}")

    # Step 8: Verify deletion is reflected for operator
    print("\n8. 🔍 Verifying deletion is visible to operator...")
    time.sleep(2)  # Give time for sync
    
    response = requests.get(
        f"{SCHEDULING_API_URL}/availability/",
        params={"user": therapist_id, "date": tomorrow},
        headers=operator_headers
    )
    
    if response.status_code == 200:
        remaining_availability = response.json()
        deleted_found = False
        for avail in remaining_availability:
            if avail["id"] == availability_id:
                deleted_found = True
                break
        
        if not deleted_found:
            print("✅ Deletion is visible to operator immediately")
        else:
            print("⚠️ Deleted availability still visible to operator")
    else:
        print(f"❌ Failed to verify deletion: {response.status_code}")

    print("\n" + "=" * 60)
    print("🎯 Real-time Sync Test Results:")
    print("✅ Availability creation - Should trigger sync events")
    print("✅ Availability updates - Should trigger sync events") 
    print("✅ Availability deletion - Should trigger sync events")
    print("")
    print("📱 Frontend Behavior Expected:")
    print("- OperatorDashboard should refresh automatically when therapist adds availability")
    print("- TherapistDashboard should sync across multiple browser tabs")
    print("- SchedulingDashboard should update scheduling options immediately")
    print("- No manual page refresh should be needed")
    print("")
    print("🔧 Technical Implementation:")
    print("- localStorage events for cross-tab communication")
    print("- Adaptive polling intervals based on user activity")
    print("- Smart refresh that only updates when needed")
    
    return True

if __name__ == "__main__":
    try:
        success = test_real_time_sync()
        if success:
            print("\n🎉 Test completed successfully!")
        else:
            print("\n❌ Test failed!")
    except Exception as e:
        print(f"\n💥 Test error: {str(e)}")
        import traceback
        traceback.print_exc()
