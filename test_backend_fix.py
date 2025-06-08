#!/usr/bin/env python3
"""
Test script to verify the backend fix for non-existent field errors.
This script simulates PATCH requests that were previously causing 500 errors.
"""

import json
import requests
import sys
import os

# Add the Django project to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "guitara"))

# Django setup
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
import django

django.setup()

from scheduling.models import Appointment
from scheduling.serializers import AppointmentSerializer


def test_serializer_with_invalid_fields():
    """Test that the serializer properly handles invalid field updates."""
    print("Testing AppointmentSerializer with invalid fields...")

    # Create a test appointment instance (not saved to DB)
    appointment = Appointment(
        status="scheduled",
        therapist_id=1,
        client_id=1,
        location="Test Location",
        scheduled_time="2024-01-01T10:00:00Z",
    )

    # Test data that previously caused errors
    invalid_update_data = {
        "status": "in_progress",
        "pickup_requested": True,  # This field doesn't exist
        "pickup_urgency": "urgent",  # This field doesn't exist
        "pickup_request_time": "2024-01-01T11:00:00Z",  # This field doesn't exist
        "notes": "Valid field update",
    }

    try:
        serializer = AppointmentSerializer(
            appointment, data=invalid_update_data, partial=True
        )
        if serializer.is_valid():
            print("✅ Serializer validation passed - invalid fields were filtered out")
            validated_data = serializer.validated_data
            print(f"   Validated data: {list(validated_data.keys())}")

            # Check that invalid fields were filtered out
            invalid_fields = [
                "pickup_requested",
                "pickup_urgency",
                "pickup_request_time",
            ]
            filtered_out = [
                field for field in invalid_fields if field not in validated_data
            ]
            if len(filtered_out) == len(invalid_fields):
                print(f"✅ All invalid fields properly filtered: {filtered_out}")
            else:
                print(
                    f"❌ Some invalid fields not filtered: {[f for f in invalid_fields if f in validated_data]}"
                )
        else:
            print(f"❌ Serializer validation failed: {serializer.errors}")
    except Exception as e:
        print(f"❌ Exception during serialization: {e}")


def test_valid_fields_only():
    """Test that valid fields still work properly."""
    print("\nTesting AppointmentSerializer with valid fields only...")

    appointment = Appointment(
        status="scheduled",
        therapist_id=1,
        client_id=1,
        location="Test Location",
        scheduled_time="2024-01-01T10:00:00Z",
    )

    valid_update_data = {
        "status": "in_progress",
        "notes": "Session in progress",
        "therapist_accepted": True,
    }

    try:
        serializer = AppointmentSerializer(
            appointment, data=valid_update_data, partial=True
        )
        if serializer.is_valid():
            print("✅ Valid fields serialization passed")
            validated_data = serializer.validated_data
            print(f"   Validated data: {list(validated_data.keys())}")
        else:
            print(f"❌ Valid fields serialization failed: {serializer.errors}")
    except Exception as e:
        print(f"❌ Exception during valid fields serialization: {e}")


if __name__ == "__main__":
    print("🧪 Testing backend fix for non-existent field errors\n")
    test_serializer_with_invalid_fields()
    test_valid_fields_only()
    print("\n✅ Backend fix testing completed!")
