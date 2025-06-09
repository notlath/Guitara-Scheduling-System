#!/usr/bin/env python
import os
import sys
import django

# Add the current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from scheduling.serializers import AppointmentSerializer
from scheduling.models import Client, Appointment
from registration.models import Service
from django.contrib.auth import get_user_model
from datetime import datetime, timedelta
from django.utils import timezone


def debug_appointment_creation():
    print("=== Debugging Appointment Creation ===")

    # Check if services exist
    services = Service.objects.all()
    print(f"Available services: {services.count()}")
    for service in services:
        print(f"  - ID: {service.id}, Name: {service.name}")

    # Check if users exist
    User = get_user_model()
    users = User.objects.all()
    print(f"Available users: {users.count()}")
    for user in users:
        print(f"  - ID: {user.id}, Username: {user.username}")

    # Check if clients exist
    clients = Client.objects.all()
    print(f"Available clients: {clients.count()}")
    for client in clients:
        print(f"  - ID: {client.id}, Name: {client.first_name} {client.last_name}")

    if services.exists() and users.exists() and clients.exists():
        # Try to create appointment data
        service = services.first()
        user = users.first()
        client = clients.first()

        appointment_data = {
            "client": client.id,
            "scheduled_date": timezone.now().date().isoformat(),
            "scheduled_time": "14:00:00",
            "duration": 60,
            "services": [service.id],  # This is the problematic field
            "notes": "Test appointment",
        }

        print(f"\nTesting appointment creation with data:")
        print(f"  client: {appointment_data['client']}")
        print(f"  services: {appointment_data['services']}")
        print(f"  scheduled_date: {appointment_data['scheduled_date']}")
        print(f"  scheduled_time: {appointment_data['scheduled_time']}")

        # Test serializer validation
        serializer = AppointmentSerializer(data=appointment_data)
        print(f"\nSerializer is_valid(): {serializer.is_valid()}")

        if not serializer.is_valid():
            print("Validation errors:")
            for field, errors in serializer.errors.items():
                print(f"  {field}: {errors}")
        else:
            print("Serializer validation passed!")

            # Try to save
            try:
                appointment = serializer.save(created_by=user)
                print(f"Appointment created successfully: {appointment.id}")
            except Exception as e:
                print(f"Error saving appointment: {e}")
    else:
        print("Missing required data in database!")
        if not services.exists():
            print("  - No services found")
        if not users.exists():
            print("  - No users found")
        if not clients.exists():
            print("  - No clients found")


if __name__ == "__main__":
    debug_appointment_creation()
