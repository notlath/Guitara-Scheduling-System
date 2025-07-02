#!/usr/bin/env python
import requests
import json

# Test the backend API for updating material status
API_BASE_URL = "http://localhost:8000/api"

def test_update_material_status():
    print("=== Testing Material Status Update API ===")
    
    # Get auth token (you would need to login first in practice)
    # For testing, let's see if the endpoint exists
    
    # Test with Peppermint Oil (assuming ID exists)
    material_id = 1  # Peppermint Oil from our check
    
    # Test data
    test_data = {
        "is_empty": True,
        "quantity": 2,
        "notes": "Test post-service update"
    }
    
    # You would need a valid token here - let's test without auth first to see the response
    headers = {
        "Content-Type": "application/json",
    }
    
    url = f"{API_BASE_URL}/inventory/{material_id}/update_material_status/"
    print(f"Testing URL: {url}")
    print(f"Test data: {json.dumps(test_data, indent=2)}")
    
    try:
        response = requests.post(url, json=test_data, headers=headers)
        print(f"Response Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 401:
            print("✅ API endpoint exists but requires authentication (expected)")
        elif response.status_code == 200:
            print("✅ API working correctly")
        else:
            print(f"❌ Unexpected response: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Error connecting to API: {e}")

if __name__ == "__main__":
    test_update_material_status()
