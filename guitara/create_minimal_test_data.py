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
from scheduling.models import Client
from core.models import CustomUser


def create_test_data():
    print("Creating test data...")

    # Create a service if none exists
    if not Service.objects.exists():
        service = Service.objects.create(
            name="Full Body Massage",
            description="Relaxing full body massage",
            duration=60,  # 60 minutes
            price=1500.00,
        )
        print(f"Created service: {service.name} (ID: {service.id})")
    else:
        service = Service.objects.first()
        print(f"Using existing service: {service.name} (ID: {service.id})")

    # Create a client if none exists
    if not Client.objects.exists():
        client = Client.objects.create(
            first_name="John",
            last_name="Doe",
            email="john.doe@example.com",
            phone_number="09123456789",
            address="123 Test Street, Test City",
        )
        print(
            f"Created client: {client.first_name} {client.last_name} (ID: {client.id})"
        )
    else:
        client = Client.objects.first()
        print(
            f"Using existing client: {client.first_name} {client.last_name} (ID: {client.id})"
        )

    # Create a user if none exists
    if not CustomUser.objects.exists():
        user = CustomUser.objects.create_user(
            username="testuser",
            email="test@example.com",
            password="testpass123",
            role="operator",
        )
        print(f"Created user: {user.username} (ID: {user.id})")
    else:
        user = CustomUser.objects.first()
        print(f"Using existing user: {user.username} (ID: {user.id})")

    print("Test data creation complete!")
    return service, client, user


if __name__ == "__main__":
    create_test_data()
