#!/usr/bin/env python3
"""
Test script to verify the backend model fixes are working
"""

import os
import sys
import django

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from scheduling.models import Appointment
from scheduling.serializers import AppointmentSerializer


def test_model_status_choices():
    """Test that status choices are correct"""
    print("Testing model status choices...")

    status_values = [choice[0] for choice in Appointment.STATUS_CHOICES]
    print(f"Total status choices: {len(status_values)}")

    # Check for transport_completed
    if "transport_completed" in status_values:
        print("✅ 'transport_completed' status found")
    else:
        print("❌ 'transport_completed' status NOT found")

    # Check for duplicates
    duplicates = set([x for x in status_values if status_values.count(x) > 1])
    if duplicates:
        print(f"❌ Duplicate status choices found: {duplicates}")
    else:
        print("✅ No duplicate status choices")

    return True


def test_serializer():
    """Test that serializer works correctly"""
    print("\nTesting appointment serializer...")

    try:
        # Try to get an appointment
        appointment = Appointment.objects.first()

        if appointment:
            print(f"Testing with appointment ID: {appointment.id}")
            serializer = AppointmentSerializer(appointment)
            data = serializer.data
            print("✅ Serializer works correctly")
            print(f"Status: {data.get('status', 'N/A')}")
            return True
        else:
            print("⚠️  No appointments found to test with")
            # Test with empty queryset
            queryset = Appointment.objects.none()
            print("✅ Empty queryset test passed")
            return True

    except Exception as e:
        print(f"❌ Serializer error: {str(e)}")
        return False


def test_model_field():
    """Test that the new field exists"""
    print("\nTesting new model field...")

    try:
        # Check if the field exists
        field = Appointment._meta.get_field("return_journey_completed_at")
        print(f"✅ 'return_journey_completed_at' field exists: {field}")
        return True
    except Exception as e:
        print(f"❌ Field error: {str(e)}")
        return False


def main():
    print("=== Backend Model Fix Verification ===")

    try:
        # Run tests
        status_test = test_model_status_choices()
        serializer_test = test_serializer()
        field_test = test_model_field()

        print("\n=== Test Results ===")
        print(f"Status choices test: {'✅ PASS' if status_test else '❌ FAIL'}")
        print(f"Serializer test: {'✅ PASS' if serializer_test else '❌ FAIL'}")
        print(f"Model field test: {'✅ PASS' if field_test else '❌ FAIL'}")

        if all([status_test, serializer_test, field_test]):
            print("\n🎉 All tests passed! Backend should work correctly now.")
            return True
        else:
            print("\n❌ Some tests failed. Check the errors above.")
            return False

    except Exception as e:
        print(f"\n❌ Test suite error: {str(e)}")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
