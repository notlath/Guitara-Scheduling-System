#!/usr/bin/env python3
"""
Test script to verify availability creation works correctly
"""
import os
import sys
import django
import requests
from datetime import datetime, timedelta

# Add the django project path
sys.path.append("guitara")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from core.models import CustomUser
from django.contrib.auth import authenticate

# API Configuration
API_BASE_URL = "http://127.0.0.1:8000/api/"

def get_auth_token(username, password):
    """Get authentication token for API requests"""
    login_url = f"{API_BASE_URL}auth/login/"
    data = {
        "username": username,
        "password": password
    }
    
    response = requests.post(login_url, json=data)
    if response.status_code == 200:
        return response.json().get("token")
    else:
        print(f"Login failed: {response.status_code} - {response.text}")
        return None

def test_availability_creation():
    """Test creating availability through the API"""
    # First, try to find a therapist to test with
    try:
        therapist = CustomUser.objects.filter(role="therapist").first()
        if not therapist:
            print("❌ No therapist found in database")
            return False
            
        print(f"✅ Found therapist: {therapist.username} (ID: {therapist.id})")
        
        # Get auth token
        token = get_auth_token(therapist.username, "password123")  # Default password
        if not token:
            print("❌ Could not authenticate therapist")
            return False
            
        print(f"✅ Authentication successful")
        
        # Test data
        tomorrow = datetime.now().date() + timedelta(days=1)
        availability_data = {
            "user": therapist.id,  # Send as integer
            "date": tomorrow.strftime("%Y-%m-%d"),
            "start_time": "09:00",
            "end_time": "17:00",
            "is_available": True
        }
        
        print(f"📝 Testing availability creation with data: {availability_data}")
        
        # Create availability
        headers = {"Authorization": f"Token {token}"}
        response = requests.post(
            f"{API_BASE_URL}scheduling/availabilities/",
            json=availability_data,
            headers=headers
        )
        
        if response.status_code == 201:
            print("✅ Availability created successfully!")
            print(f"Response: {response.json()}")
            return True
        else:
            print(f"❌ Availability creation failed: {response.status_code}")
            print(f"Error details: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Testing availability creation...")
    success = test_availability_creation()
    
    if success:
        print("\n✅ All tests passed!")
    else:
        print("\n❌ Tests failed!")
        sys.exit(1)
