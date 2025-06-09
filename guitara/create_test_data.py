#!/usr/bin/env python
import os
import django
import sys

# Add the project path to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set the Django settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "settings")

# Setup Django
django.setup()

from registration.models import Service
from scheduling.models import Client
from core.models import CustomUser


def create_test_data():
    print("Creating test data...")

    # Create a test service if none exists
    if not Service.objects.exists():
        service = Service.objects.create(
            name="Massage Therapy",
            description="Full body massage",
            duration=60,
            price=100.00,
        )
        print(f"Created service: {service}")
    else:
        print(f"Services already exist: {Service.objects.count()}")

    # Create a test client if none exists
    if not Client.objects.exists():
        client = Client.objects.create(
            first_name="Test",
            last_name="Client",
            phone_number="1234567890",
            address="Test Address",
        )
        print(f"Created client: {client}")
    else:
        print(f"Clients already exist: {Client.objects.count()}")

    # Create test users if they don't exist
    if not CustomUser.objects.filter(role="operator").exists():
        operator = CustomUser.objects.create_user(
            username="operator", password="test123", role="operator"
        )
        print(f"Created operator: {operator}")
    else:
        print("Operator already exists")

    if not CustomUser.objects.filter(role="therapist").exists():
        therapist = CustomUser.objects.create_user(
            username="therapist", password="test123", role="therapist"
        )
        print(f"Created therapist: {therapist}")
    else:
        print("Therapist already exists")

    if not CustomUser.objects.filter(role="driver").exists():
        driver = CustomUser.objects.create_user(
            username="driver", password="test123", role="driver"
        )
        print(f"Created driver: {driver}")
    else:
        print("Driver already exists")

    print("Test data creation completed!")


if __name__ == "__main__":
    create_test_data()
