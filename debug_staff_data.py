#!/usr/bin/env python
"""
Debug script to check staff member data and is_active field values
"""

import requests
import json
import sys

# Configuration
API_BASE_URL = "http://localhost:8000/api"

def debug_staff_data():
    """Debug the staff members API to see what data is being returned"""
    print("🔍 Debugging Staff Members API Data")
    print("=" * 50)
    
    # Step 1: Login as operator
    print("1. 🔐 Logging in as operator...")
    login_data = {
        "username": "operator1",
        "password": "testpassword123"
    }
    
    response = requests.post(f"{API_BASE_URL}/auth/login/", json=login_data)
    if response.status_code != 200:
        print(f"❌ Operator login failed: {response.status_code} - {response.text}")
        return False
    
    operator_token = response.json()["token"]
    headers = {"Authorization": f"Token {operator_token}"}
    print("✅ Operator logged in successfully")
    
    # Step 2: Fetch staff members
    print("\n2. 👥 Fetching staff members...")
    response = requests.get(f"{API_BASE_URL}/scheduling/staff/", headers=headers)
    if response.status_code != 200:
        print(f"❌ Failed to fetch staff members: {response.status_code}")
        print(f"Response: {response.text}")
        return False
    
    staff_members = response.json()
    print(f"✅ Fetched {len(staff_members)} staff members")
    
    # Step 3: Analyze each staff member
    print("\n3. 🔍 Analyzing staff member data:")
    print("-" * 80)
    
    for i, staff in enumerate(staff_members, 1):
        print(f"\nStaff Member #{i}:")
        print(f"  ID: {staff.get('id')}")
        print(f"  Name: {staff.get('first_name')} {staff.get('last_name')}")
        print(f"  Username: {staff.get('username')}")
        print(f"  Role: {staff.get('role')}")
        print(f"  is_active: {staff.get('is_active')} (type: {type(staff.get('is_active'))})")
        print(f"  is_staff: {staff.get('is_staff')}")
        print(f"  is_superuser: {staff.get('is_superuser')}")
        print(f"  date_joined: {staff.get('date_joined')}")
        print(f"  last_login: {staff.get('last_login')}")
        
        # Check if is_active field evaluation
        is_active_value = staff.get('is_active')
        print(f"  Evaluation checks:")
        print(f"    is_active == True: {is_active_value == True}")
        print(f"    is_active == 'true': {is_active_value == 'true'}")
        print(f"    is_active == 1: {is_active_value == 1}")
        print(f"    bool(is_active): {bool(is_active_value)}")
        
        # Show all available fields
        print(f"  All fields: {list(staff.keys())}")
    
    # Step 4: Test creating a disabled user for testing
    print(f"\n4. 🧪 Testing account status toggling...")
    if staff_members:
        test_staff = staff_members[0]
        print(f"Testing with: {test_staff['first_name']} {test_staff['last_name']}")
        print(f"Current is_active: {test_staff['is_active']}")
        
        # Toggle account status
        response = requests.patch(
            f"{API_BASE_URL}/toggle-account-status/{test_staff['id']}/",
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Toggle successful: {result['message']}")
            updated_user = result['user']
            print(f"New is_active value: {updated_user['is_active']} (type: {type(updated_user['is_active'])})")
        else:
            print(f"❌ Toggle failed: {response.status_code} - {response.text}")
    
    print(f"\n{'='*50}")
    print("🎯 Summary:")
    print(f"- Found {len(staff_members)} staff members")
    print("- Check the is_active field types and values above")
    print("- Verify if the frontend boolean logic needs adjustment")
    
    return True

if __name__ == "__main__":
    print("Starting Staff Data Debug Script...")
    print("Make sure the Django server is running on http://localhost:8000")
    print()
    
    try:
        success = debug_staff_data()
        if not success:
            sys.exit(1)
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to Django server at http://localhost:8000")
        print("Please make sure the server is running with: python manage.py runserver")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        sys.exit(1)
