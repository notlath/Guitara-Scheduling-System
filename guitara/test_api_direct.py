#!/usr/bin/env python
import os
import sys
import django

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from registration.models import Service
from scheduling.models import Client, Appointment
from core.models import CustomUser
from django.db import transaction
import requests
import json


def test_api_call():
    print("=== Testing API Call Directly ===")

    # Check if services exist
    services = Service.objects.all()
    print(f"Available services: {services.count()}")
    for service in services:
        print(f"  - ID: {service.id}, Name: {service.name}")

    if not services.exists():
        print("No services found, creating a test service...")
        service = Service.objects.create(
            name="Test Massage",
            description="Test service for debugging",
            duration=60,
            price=100.00,
        )
        print(f"Created service: {service.name} (ID: {service.id})")
        services = Service.objects.all()

    # Check if clients exist
    clients = Client.objects.all()
    print(f"Available clients: {clients.count()}")

    if not clients.exists():
        print("No clients found, creating a test client...")
        client = Client.objects.create(
            first_name="John",
            last_name="Doe",
            phone_number="09123456789",
            address="123 Test Street",
        )
        print(
            f"Created client: {client.first_name} {client.last_name} (ID: {client.id})"
        )
        clients = Client.objects.all()

    # Check if users exist
    users = CustomUser.objects.all()
    print(f"Available users: {users.count()}")

    if not users.exists():
        print("No users found, creating test users...")
        operator = CustomUser.objects.create_user(
            username="testoperator",
            email="operator@test.com",
            password="testpass123",
            role="operator",
        )
        therapist = CustomUser.objects.create_user(
            username="testtherapist",
            email="therapist@test.com",
            password="testpass123",
            role="therapist",
        )
        driver = CustomUser.objects.create_user(
            username="testdriver",
            email="driver@test.com",
            password="testpass123",
            role="driver",
        )
        print(
            f"Created users: operator (ID: {operator.id}), therapist (ID: {therapist.id}), driver (ID: {driver.id})"
        )
        users = CustomUser.objects.all()

    # Now try to make API call
    service = services.first()
    client = clients.first()
    therapist = users.filter(role="therapist").first()
    driver = users.filter(role="driver").first()
    operator = users.filter(role="operator").first()

    if service and client and therapist and driver and operator:
        # Test data payload
        payload = {
            "client": client.id,
            "services": [service.id],
            "therapist": therapist.id,
            "driver": driver.id,
            "date": "2025-06-10",
            "start_time": "14:00",
            "location": "Test Location",
            "notes": "Test appointment",
        }

        print(f"\nTest payload:")
        print(json.dumps(payload, indent=2))

        # Try to get an auth token first
        try:
            print("\nTrying to get auth token...")
            auth_response = requests.post(
                "http://localhost:8000/api/auth/login/",
                {"username": operator.username, "password": "testpass123"},
            )
            print(f"Auth response status: {auth_response.status_code}")

            if auth_response.status_code == 200:
                auth_data = auth_response.json()
                token = auth_data.get("token")
                print(
                    f"Got token: {token[:20]}..." if token else "No token in response"
                )

                if token:
                    # Make appointment creation request
                    headers = {
                        "Authorization": f"Token {token}",
                        "Content-Type": "application/json",
                    }

                    print("\nTrying to create appointment...")
                    response = requests.post(
                        "http://localhost:8000/api/scheduling/appointments/",
                        data=json.dumps(payload),
                        headers=headers,
                    )

                    print(f"Response status: {response.status_code}")
                    print(f"Response data: {response.text}")

                    if response.status_code == 400:
                        try:
                            error_data = response.json()
                            print(f"Validation errors: {error_data}")
                        except:
                            print("Could not parse error response as JSON")
                else:
                    print("Failed to get authentication token")
            else:
                print(f"Authentication failed: {auth_response.text}")
        except requests.exceptions.ConnectionError:
            print(
                "Could not connect to Django server. Make sure it's running on port 8000."
            )
        except Exception as e:
            print(f"Error making API request: {e}")
    else:
        print("Missing required data:")
        print(f"  Service: {service}")
        print(f"  Client: {client}")
        print(f"  Therapist: {therapist}")
        print(f"  Driver: {driver}")
        print(f"  Operator: {operator}")


if __name__ == "__main__":
    test_api_call()
