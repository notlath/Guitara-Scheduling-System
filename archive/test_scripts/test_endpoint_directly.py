#!/usr/bin/env python
"""
Quick test to identify the notifications endpoint issue
"""
import requests
import json


# Test the notifications endpoint directly
def test_notifications_endpoint():
    print("Testing notifications endpoint...")

    url = "http://localhost:8000/api/scheduling/notifications/"

    try:
        # Test without authentication first
        print("Testing without authentication...")
        response = requests.get(url, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")

        if response.status_code == 500:
            print("❌ 500 Internal Server Error!")
            print("Response content:")
            print(response.text)
        else:
            print("✓ No 500 error")
            print("Response content:")
            print(response.text[:500])

    except requests.exceptions.ConnectionError:
        print("❌ Connection error - Django server might not be running")
    except requests.exceptions.Timeout:
        print("❌ Request timeout")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")


def test_with_session():
    """Test with a session (simulating browser behavior)"""
    print("\nTesting with session...")

    session = requests.Session()

    # First get the main page to establish session
    try:
        print("Getting main page first...")
        main_response = session.get("http://localhost:8000/", timeout=10)
        print(f"Main page status: {main_response.status_code}")

        # Now try notifications
        print("Testing notifications with session...")
        notif_response = session.get(
            "http://localhost:8000/api/scheduling/notifications/", timeout=10
        )
        print(f"Notifications status: {notif_response.status_code}")

        if notif_response.status_code == 500:
            print("❌ 500 Internal Server Error with session!")
            print("Response content:")
            print(notif_response.text)
        else:
            print("✓ No 500 error with session")

    except Exception as e:
        print(f"❌ Session test error: {e}")


if __name__ == "__main__":
    test_notifications_endpoint()
    test_with_session()
