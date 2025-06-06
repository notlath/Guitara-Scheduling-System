#!/usr/bin/env python3
"""
Test script for cross-day availability functionality.
Tests the ability to create availability from 13:00 (1PM) to 01:00 (1AM next day).
"""

import os
import sys
import django
from datetime import datetime, time, date
import requests
import json

# Add the guitara directory to the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "guitara"))

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from scheduling.models import Availability
from core.models import CustomUser
from django.core.exceptions import ValidationError


def test_model_validation():
    """Test the Django model validation for cross-day availability."""
    print("🧪 Testing Django model validation...")

    try:
        # Get or create a test user
        test_user, created = CustomUser.objects.get_or_create(
            username="test_therapist",
            defaults={
                "first_name": "Test",
                "last_name": "Therapist",
                "role": "therapist",
                "email": "test@example.com",
            },
        )

        if created:
            print("✅ Created test therapist user")
        else:
            print("✅ Using existing test therapist user")

        # Test cross-day availability (1PM to 1AM next day)
        test_availability = Availability(
            user=test_user,
            date=date.today(),
            start_time=time(13, 0),  # 1:00 PM
            end_time=time(1, 0),  # 1:00 AM (next day)
            is_available=True,
        )

        # This should NOT raise a ValidationError anymore
        try:
            test_availability.full_clean()
            print("✅ Cross-day availability validation passed!")

            # Save to database
            test_availability.save()
            print("✅ Cross-day availability saved to database!")

            # Clean up
            test_availability.delete()
            print("✅ Test availability cleaned up")

        except ValidationError as e:
            print(f"❌ Cross-day availability validation failed: {e}")
            return False

    except Exception as e:
        print(f"❌ Model test failed: {e}")
        return False

    return True


def test_api_endpoint():
    """Test the API endpoint for creating cross-day availability."""
    print("\n🧪 Testing API endpoint...")

    # Test data for cross-day availability
    test_data = {
        "user": 1,  # Assuming user ID 1 exists
        "date": "2025-06-07",
        "start_time": "13:00",
        "end_time": "01:00",
        "is_available": True,
    }

    try:
        # Note: This would need a real token in a production test
        headers = {
            "Content-Type": "application/json",
            # 'Authorization': 'Token your_test_token_here'
        }

        response = requests.post(
            "http://localhost:8000/api/scheduling/availabilities/",
            json=test_data,
            headers=headers,
        )

        if response.status_code in [200, 201]:
            print("✅ API endpoint accepted cross-day availability!")
            print(f"Response: {response.json()}")
            return True
        else:
            print(
                f"❌ API endpoint rejected cross-day availability: {response.status_code}"
            )
            print(f"Response: {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print("⚠️ Could not connect to API endpoint (server may not be running)")
        return None
    except Exception as e:
        print(f"❌ API test failed: {e}")
        return False


def test_serializer_validation():
    """Test the serializer validation for cross-day availability."""
    print("\n🧪 Testing serializer validation...")

    try:
        from scheduling.serializers import AvailabilitySerializer

        # Test data for cross-day availability
        test_data = {
            "user": 1,
            "date": "2025-06-07",
            "start_time": "13:00",
            "end_time": "01:00",
            "is_available": True,
        }

        serializer = AvailabilitySerializer(data=test_data)

        if serializer.is_valid():
            print("✅ Serializer validation passed for cross-day availability!")
            return True
        else:
            print(f"❌ Serializer validation failed: {serializer.errors}")
            return False

    except Exception as e:
        print(f"❌ Serializer test failed: {e}")
        return False


def run_tests():
    """Run all tests."""
    print("🚀 Testing Cross-Day Availability Implementation")
    print("=" * 50)

    results = {
        "model": test_model_validation(),
        "serializer": test_serializer_validation(),
        "api": test_api_endpoint(),
    }

    print("\n📊 Test Results:")
    print("=" * 30)

    for test_name, result in results.items():
        if result is True:
            print(f"✅ {test_name.title()} Test: PASSED")
        elif result is False:
            print(f"❌ {test_name.title()} Test: FAILED")
        else:
            print(f"⚠️ {test_name.title()} Test: SKIPPED")

    # Overall result
    passed_tests = sum(1 for r in results.values() if r is True)
    total_tests = sum(1 for r in results.values() if r is not None)

    print(f"\n🎯 Overall: {passed_tests}/{total_tests} tests passed")

    if passed_tests == total_tests:
        print("🎉 All tests passed! Cross-day availability is working!")
    else:
        print("⚠️ Some tests failed. Please review the implementation.")


if __name__ == "__main__":
    run_tests()
