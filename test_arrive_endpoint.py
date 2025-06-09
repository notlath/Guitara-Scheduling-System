#!/usr/bin/env python3
"""
Test script to verify the arrive_at_location endpoint exists and is working
"""
import requests
import json

def test_arrive_endpoint():
    base_url = "http://localhost:8000"
    
    # First, get an auth token (you'll need to provide valid credentials)
    # For now, just test if the endpoint structure is correct
    
    print("Testing arrive_at_location endpoint availability...")
    
    # Test with a dummy appointment ID
    test_appointment_id = 1
    url = f"{base_url}/api/scheduling/appointments/{test_appointment_id}/arrive_at_location/"
    
    print(f"Testing URL: {url}")
    
    try:
        # Make a simple GET request to see if the endpoint exists
        # (it will likely return 405 Method Not Allowed since it expects POST)
        response = requests.get(url)
        print(f"GET Response status: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Try POST without auth (should get 401 or similar)
        response = requests.post(url)
        print(f"POST Response status: {response.status_code}")
        print(f"Response: {response.text}")
        
    except requests.exceptions.ConnectionError:
        print("Could not connect to backend server. Is it running on localhost:8000?")
    except Exception as e:
        print(f"Error testing endpoint: {e}")

if __name__ == "__main__":
    test_arrive_endpoint()
