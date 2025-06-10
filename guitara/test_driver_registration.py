#!/usr/bin/env python
import os
import django
from django.conf import settings

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from registration.views import RegisterDriver
from registration.serializers import DriverSerializer
from registration.views import insert_into_table
import json
from rest_framework.test import APIRequestFactory
from django.test import RequestFactory
from rest_framework.response import Response


def test_driver_registration():
    print("Testing driver registration...")

    # Create test data
    test_data = {
        "first_name": "Jay",
        "last_name": "Marasigan",
        "username": "rcd_marasigan",
        "email": "rcd.marasigan@gmail.com",
    }

    print("Test data:", test_data)

    # Test serializer first
    print("\n1. Testing serializer...")
    serializer = DriverSerializer(data=test_data)
    print("Serializer valid:", serializer.is_valid())
    if not serializer.is_valid():
        print("Serializer errors:", serializer.errors)
        return
    else:
        print("Validated data:", serializer.validated_data)

    # Test the insert_into_table function directly
    print("\n2. Testing insert_into_table function...")
    try:
        validated_data = serializer.validated_data
        driver_data = {
            "first_name": validated_data["first_name"],
            "last_name": validated_data["last_name"],
            "username": validated_data["username"],
            "email": validated_data["email"],
        }
        print("Data to insert:", driver_data)

        inserted_data, error = insert_into_table("registration_driver", driver_data)
        if error:
            print("Insert error:", error)
        else:
            print("Insert successful:", inserted_data)

    except Exception as e:
        print("Exception during insert:", str(e))
        import traceback

        traceback.print_exc()

    # Test the full view
    print("\n3. Testing full RegisterDriver view...")
    try:
        factory = APIRequestFactory()
        request = factory.post(
            "/registration/register/driver/", test_data, format="json"
        )

        view = RegisterDriver()
        response = view.post(request)

        print("Response status:", response.status_code)
        print("Response data:", response.data)

    except Exception as e:
        print("Exception during view test:", str(e))
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    test_driver_registration()
