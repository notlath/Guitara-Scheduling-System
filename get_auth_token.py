#!/usr/bin/env python3
"""
Get authentication token for testing WebSocket connection
"""
import requests
import json

def get_auth_token():
    # Try to login and get a token
    login_url = "http://localhost:8000/api/auth/login/"
    
    # Test with common test credentials
    test_credentials = [
        {"username": "testtherapist", "password": "password123"},
        {"username": "therapist1", "password": "password123"},
        {"username": "admin", "password": "admin123"},
        {"username": "test", "password": "test123"},
        {"username": "therapist", "password": "therapist123"},
    ]
    
    for creds in test_credentials:
        try:
            print(f"Trying credentials: {creds['username']}")
            response = requests.post(login_url, data=creds)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ Login successful!")
                print(f"User: {data.get('user', {}).get('username')}")
                print(f"Role: {data.get('user', {}).get('role')}")
                print(f"Token: {data.get('token')}")
                return data.get('token')
            else:
                print(f"✗ Failed: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"✗ Error: {e}")
    
    return None

if __name__ == "__main__":
    token = get_auth_token()
    if token:
        print(f"\nAuthentication token: {token}")
    else:
        print("\nNo valid credentials found. You may need to create a test user first.")
