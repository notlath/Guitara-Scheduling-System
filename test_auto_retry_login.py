"""
Test script for auto-retry login functionality
Tests account status polling and automatic re-enablement detection
"""

import requests
import time
import json

# Configuration
API_BASE_URL = "http://localhost:8000/api"
TEST_USERNAME = "test_therapist"
TEST_PASSWORD = "TestPassword123!"


def test_check_account_status():
    """Test the new check-account-status endpoint"""
    print("Testing account status checking...")

    url = f"{API_BASE_URL}/check-account-status/"
    data = {"username": TEST_USERNAME}

    try:
        response = requests.post(url, json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")

        if response.status_code == 200:
            result = response.json()
            print(
                f"✓ Account '{result['username']}' is {'active' if result['is_active'] else 'disabled'}"
            )
            return result["is_active"]
        else:
            print(f"✗ Failed to check account status: {response.json()}")
            return None

    except Exception as e:
        print(f"✗ Error checking account status: {e}")
        return None


def test_login_attempt():
    """Test login attempt with current credentials"""
    print("Testing login attempt...")

    url = f"{API_BASE_URL}/auth/login/"
    data = {"username": TEST_USERNAME, "password": TEST_PASSWORD}

    try:
        response = requests.post(url, json=data)
        print(f"Login Status Code: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            print("✓ Login successful")
            return True
        elif response.status_code == 403:
            error_data = response.json()
            print(f"✗ Login blocked: {error_data.get('message', 'Account disabled')}")
            return False
        else:
            print(f"✗ Login failed: {response.json()}")
            return False

    except Exception as e:
        print(f"✗ Error during login: {e}")
        return False


def simulate_account_status_polling():
    """Simulate the frontend polling behavior"""
    print(
        "Simulating account status polling (checking every 5 seconds for 30 seconds)..."
    )

    max_attempts = 6
    interval = 5

    for attempt in range(1, max_attempts + 1):
        print(f"\nAttempt {attempt}/{max_attempts}")

        is_active = test_check_account_status()

        if is_active is True:
            print("✓ Account is now active! Attempting login...")
            if test_login_attempt():
                print("✓ Login successful after re-enablement!")
                return True
            else:
                print("✗ Login still failed despite active status")
        elif is_active is False:
            print("⏳ Account still disabled, waiting...")
        else:
            print("❓ Unable to determine account status")

        if attempt < max_attempts:
            print(f"Waiting {interval} seconds before next check...")
            time.sleep(interval)

    print(f"\n✗ Account not re-enabled after {max_attempts} attempts")
    return False


def test_auto_retry_workflow():
    """Test the complete auto-retry workflow"""
    print("=" * 60)
    print("TESTING AUTO-RETRY LOGIN WORKFLOW")
    print("=" * 60)

    # Step 1: Check initial account status
    print("\n1. Checking initial account status...")
    initial_status = test_check_account_status()

    # Step 2: Attempt initial login
    print("\n2. Attempting initial login...")
    login_success = test_login_attempt()

    if login_success:
        print("✓ Login successful - no retry needed")
        return

    if initial_status is False:
        print("\n3. Account is disabled - starting polling simulation...")
        print("NOTE: To test the complete workflow:")
        print("1. Run this script")
        print("2. Use the operator dashboard to re-enable the account")
        print("3. Observe the automatic detection and retry")

        # Start polling
        if simulate_account_status_polling():
            print("\n✓ Auto-retry workflow completed successfully!")
        else:
            print("\n✗ Auto-retry workflow failed")
    else:
        print("\n✗ Unexpected state - account appears active but login failed")


if __name__ == "__main__":
    test_auto_retry_workflow()
