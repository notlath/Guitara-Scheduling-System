#!/usr/bin/env python3
"""
Test script to verify availability creation and fetching workflow
"""

import os
import sys
import django
import requests
from datetime import datetime, timedelta

# Add project root to path and configure Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")

# Initialize Django
import guitara.settings as settings

django.setup()

from authentication.models import CustomUser
from scheduling.models import Availability

API_BASE_URL = "http://localhost:8000/api/"


def get_auth_token(username, password):
    """Get authentication token for user"""
    try:
        response = requests.post(
            f"{API_BASE_URL}authentication/login/",
            json={"username": username, "password": password},
        )
        if response.status_code == 200:
            return response.json().get("token")
        else:
            print(f"Login failed: {response.status_code} - {response.text}")
            return None
    except Exception as e:
        print(f"Login error: {e}")
        return None


def test_availability_workflow():
    """Test the complete availability creation and fetching workflow"""
    print("🔍 Testing Availability Creation and Display Workflow")
    print("=" * 60)

    try:
        # Find a therapist to test with
        therapist = CustomUser.objects.filter(role="therapist").first()
        if not therapist:
            print("❌ No therapist found in database")
            return False

        print(f"👤 Testing with therapist: {therapist.username} (ID: {therapist.id})")

        # Get auth token
        token = get_auth_token(therapist.username, "password123")
        if not token:
            print("❌ Could not authenticate therapist")
            return False

        print(f"🔑 Authentication successful")

        # Test date - tomorrow
        tomorrow = datetime.now().date() + timedelta(days=1)
        date_str = tomorrow.strftime("%Y-%m-%d")

        print(f"📅 Using test date: {date_str}")

        # Step 1: Check existing availability for this date
        print("\n📋 Step 1: Checking existing availability...")
        headers = {"Authorization": f"Token {token}"}
        response = requests.get(
            f"{API_BASE_URL}scheduling/availabilities/?user={therapist.id}&date={date_str}",
            headers=headers,
        )

        if response.status_code == 200:
            existing_avail = response.json()
            print(
                f"✅ Existing availability fetched successfully: {len(existing_avail)} records"
            )
            for avail in existing_avail:
                print(
                    f"   - {avail['date']} {avail['start_time']}-{avail['end_time']} (ID: {avail['id']})"
                )
        else:
            print(f"❌ Failed to fetch existing availability: {response.status_code}")
            print(f"Error: {response.text}")
            return False

        # Step 2: Create new availability
        print("\n✨ Step 2: Creating new availability...")
        availability_data = {
            "user": therapist.id,
            "date": date_str,
            "start_time": "14:00",
            "end_time": "16:00",
            "is_available": True,
        }

        print(f"📝 Creating availability with data: {availability_data}")
        response = requests.post(
            f"{API_BASE_URL}scheduling/availabilities/",
            json=availability_data,
            headers=headers,
        )

        if response.status_code == 201:
            created_avail = response.json()
            print(f"✅ Availability created successfully!")
            print(
                f"   Created: {created_avail['date']} {created_avail['start_time']}-{created_avail['end_time']} (ID: {created_avail['id']})"
            )
        else:
            print(f"❌ Availability creation failed: {response.status_code}")
            print(f"Error: {response.text}")
            return False

        # Step 3: Immediately fetch availability again to verify it appears
        print("\n🔄 Step 3: Fetching availability immediately after creation...")
        response = requests.get(
            f"{API_BASE_URL}scheduling/availabilities/?user={therapist.id}&date={date_str}",
            headers=headers,
        )

        if response.status_code == 200:
            updated_avail = response.json()
            print(
                f"✅ Updated availability fetched successfully: {len(updated_avail)} records"
            )

            # Check if the new availability appears
            found_new = False
            for avail in updated_avail:
                print(
                    f"   - {avail['date']} {avail['start_time']}-{avail['end_time']} (ID: {avail['id']})"
                )
                if avail["id"] == created_avail["id"]:
                    found_new = True
                    print(f"     ✅ FOUND: This is the newly created availability!")

            if found_new:
                print(
                    f"\n🎉 SUCCESS: New availability appears in fetch results immediately!"
                )
                return True
            else:
                print(
                    f"\n❌ PROBLEM: New availability does NOT appear in fetch results!"
                )
                print(f"   Expected to find ID {created_avail['id']} in the list")
                return False
        else:
            print(f"❌ Failed to fetch updated availability: {response.status_code}")
            print(f"Error: {response.text}")
            return False

    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback

        traceback.print_exc()
        return False


def cleanup_test_data():
    """Clean up any test availability data"""
    print("\n🧹 Cleaning up test data...")
    try:
        tomorrow = datetime.now().date() + timedelta(days=1)
        test_avail = Availability.objects.filter(
            date=tomorrow, start_time="14:00", end_time="16:00"
        )
        count = test_avail.count()
        if count > 0:
            test_avail.delete()
            print(f"✅ Cleaned up {count} test availability records")
        else:
            print("ℹ️ No test data to clean up")
    except Exception as e:
        print(f"⚠️ Cleanup error: {e}")


if __name__ == "__main__":
    print("🧪 Availability Display Test Script")
    print("=" * 40)

    # Clean up any existing test data first
    cleanup_test_data()

    # Run the test
    success = test_availability_workflow()

    # Clean up after test
    cleanup_test_data()

    print("\n" + "=" * 60)
    if success:
        print("🎉 Test PASSED: Availability creation and fetching works correctly!")
    else:
        print("❌ Test FAILED: There's an issue with availability display workflow")
