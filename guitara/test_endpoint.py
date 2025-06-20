#!/usr/bin/env python
import os
import django
import json

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from django.test import RequestFactory
from registration.views import RegisterOperator


def test_registration_endpoint():
    print("Testing RegisterOperator endpoint...")

    factory = RequestFactory()

    # Create a test POST request
    test_data = {
        "first_name": "Test",
        "last_name": "Operator",
        "username": "testop123",
        "email": "testop@example.com",
    }

    request = factory.post(
        "/api/registration/register/operator/",
        data=json.dumps(test_data),
        content_type="application/json",
    )

    # Create the view instance and call it
    view = RegisterOperator()
    try:
        response = view.post(request)
        print(f"✅ Response status: {response.status_code}")
        print(f"Response data: {response.data}")
    except Exception as e:
        print(f"❌ Error calling endpoint: {str(e)}")
        import traceback

        print(traceback.format_exc())


if __name__ == "__main__":
    test_registration_endpoint()
