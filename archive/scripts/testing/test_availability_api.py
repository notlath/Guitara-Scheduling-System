#!/usr/bin/env python3
"""
Test script to verify the availability API endpoints are working correctly
"""
import requests
import json
from datetime import datetime, timedelta

# Test configuration
BASE_URL = "http://localhost:8000/api/scheduling/"
TEST_DATE = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
TEST_START_TIME = "09:00"
TEST_END_TIME = "10:00"


def test_therapists_endpoint():
    """Test the available therapists endpoint"""
    url = f"{BASE_URL}availabilities/available_therapists/"
    params = {
        "date": TEST_DATE,
        "start_time": TEST_START_TIME,
        "end_time": TEST_END_TIME,
    }

    print(f"Testing therapists endpoint: {url}")
    print(f"Parameters: {params}")

    try:
        response = requests.get(url, params=params)
        print(f"Status code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"Response data: {json.dumps(data, indent=2)}")

            # Check if response has the expected structure
            if isinstance(data, list):
                print(f"✓ Received {len(data)} therapists")
                if data:
                    therapist = data[0]
                    expected_fields = [
                        "id",
                        "first_name",
                        "last_name",
                        "email",
                        "role",
                        "specialization",
                        "massage_pressure",
                        "start_time",
                        "end_time",
                        "is_available",
                        "availability_date",
                    ]
                    for field in expected_fields:
                        if field in therapist:
                            print(f"✓ Found field: {field}")
                        else:
                            print(f"✗ Missing field: {field}")
            else:
                print("✗ Response is not a list")

        elif response.status_code == 401:
            print("⚠ Authentication required - this is expected if not logged in")
        else:
            print(f"✗ Error: {response.text}")

    except requests.exceptions.ConnectionError:
        print("✗ Could not connect to server. Is Django running?")
    except Exception as e:
        print(f"✗ Error: {e}")


def test_drivers_endpoint():
    """Test the available drivers endpoint"""
    url = f"{BASE_URL}availabilities/available_drivers/"
    params = {
        "date": TEST_DATE,
        "start_time": TEST_START_TIME,
        "end_time": TEST_END_TIME,
    }

    print(f"\nTesting drivers endpoint: {url}")
    print(f"Parameters: {params}")

    try:
        response = requests.get(url, params=params)
        print(f"Status code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"Response data: {json.dumps(data, indent=2)}")

            # Check if response has the expected structure
            if isinstance(data, list):
                print(f"✓ Received {len(data)} drivers")
                if data:
                    driver = data[0]
                    expected_fields = [
                        "id",
                        "first_name",
                        "last_name",
                        "email",
                        "role",
                        "motorcycle_plate",
                        "start_time",
                        "end_time",
                        "is_available",
                        "availability_date",
                    ]
                    for field in expected_fields:
                        if field in driver:
                            print(f"✓ Found field: {field}")
                        else:
                            print(f"✗ Missing field: {field}")
            else:
                print("✗ Response is not a list")

        elif response.status_code == 401:
            print("⚠ Authentication required - this is expected if not logged in")
        else:
            print(f"✗ Error: {response.text}")

    except requests.exceptions.ConnectionError:
        print("✗ Could not connect to server. Is Django running?")
    except Exception as e:
        print(f"✗ Error: {e}")


if __name__ == "__main__":
    print("Testing Availability API Endpoints")
    print("=" * 50)
    test_therapists_endpoint()
    test_drivers_endpoint()
    print("\nTest completed!")
