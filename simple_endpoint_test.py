#!/usr/bin/env python3
"""
Simple test to verify the complete endpoint permission fix
"""
import requests
import json


def test_complete_endpoint():
    # Test the complete endpoint with proper authentication
    base_url = "http://localhost:8000"

    print("=== Testing Complete Endpoint Fix ===")

    # First, let's see what happens when we call the endpoint without auth
    response = requests.post(f"{base_url}/api/scheduling/appointments/14/complete/")
    print(f"Without auth - Status: {response.status_code}")

    if response.status_code == 401:
        print("✅ Endpoint exists and requires authentication")
    elif response.status_code == 404:
        print("❌ Endpoint not found")
    else:
        print(f"Response: {response.text}")

    print("\nTo test with authentication, you need to:")
    print("1. Clear browser cache (Ctrl+Shift+R)")
    print("2. Login as a therapist assigned to appointment 14")
    print("3. Try clicking 'Complete Session' again")


if __name__ == "__main__":
    test_complete_endpoint()
