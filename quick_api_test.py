#!/usr/bin/env python3
"""
Quick API connectivity test
"""
import requests
import json


def test_api_connectivity():
    """Test basic API connectivity"""
    print("🔍 Testing API Connectivity")
    print("=" * 40)

    # Test if Django server is running
    try:
        response = requests.get("http://localhost:8000/", timeout=5)
        print(f"✅ Django server reachable: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Django server unreachable: {e}")
        return False

    # Test appointments endpoint without auth (should get 401)
    try:
        response = requests.get(
            "http://localhost:8000/api/scheduling/appointments/", timeout=5
        )
        print(f"📋 Appointments endpoint status: {response.status_code}")
        if response.status_code == 401:
            print("✅ Authentication required (expected)")
            return True
        elif response.status_code == 200:
            data = response.json()
            print(
                f"📊 Appointments found: {len(data) if isinstance(data, list) else len(data.get('results', []))}"
            )
            return True
        else:
            print(f"⚠️  Unexpected status: {response.status_code}")
            print(f"Response: {response.text[:200]}")
    except requests.exceptions.RequestException as e:
        print(f"❌ API endpoint unreachable: {e}")
        return False

    return True


if __name__ == "__main__":
    test_api_connectivity()
