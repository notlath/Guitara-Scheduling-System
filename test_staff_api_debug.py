import requests
import json

# Test the staff API to check is_active field
def test_staff_api():
    # Get auth token first
    login_url = "http://localhost:8000/api/auth/login/"
    login_data = {
        "username": "operator1",  # Use operator account
        "password": "password123"
    }
    
    try:
        # Login to get token
        response = requests.post(login_url, json=login_data)
        if response.status_code == 200:
            token = response.json().get("token")
            print(f"✅ Login successful, token: {token[:20]}...")
            
            # Get staff members
            staff_url = "http://localhost:8000/api/scheduling/staff/"
            headers = {"Authorization": f"Token {token}"}
            
            staff_response = requests.get(staff_url, headers=headers)
            if staff_response.status_code == 200:
                staff_data = staff_response.json()
                print(f"✅ Staff API successful, received {len(staff_data)} staff members")
                
                # Examine each staff member's is_active field
                for staff in staff_data:
                    print(f"\n👤 Staff: {staff.get('first_name')} {staff.get('last_name')}")
                    print(f"   ID: {staff.get('id')}")
                    print(f"   Role: {staff.get('role')}")
                    print(f"   is_active: {staff.get('is_active')} (type: {type(staff.get('is_active'))})")
                    
            else:
                print(f"❌ Staff API failed: {staff_response.status_code}")
                print(f"   Response: {staff_response.text}")
                
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(f"   Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    test_staff_api()
