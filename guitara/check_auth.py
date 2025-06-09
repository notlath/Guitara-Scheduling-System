#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from registration.models import Service
from scheduling.models import Client, Appointment
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
import json

try:
    # Check services
    services = Service.objects.all()
    print(f"SERVICES COUNT: {services.count()}")
    for s in services:
        print(f"  ID={s.id}, NAME={s.name}, ACTIVE={s.is_active}")

    # Check users and tokens
    User = get_user_model()
    users = User.objects.all()
    print(f"\nUSERS COUNT: {users.count()}")
    for user in users:
        try:
            token = Token.objects.get(user=user)
            print(f"  USER: {user.username}, TOKEN: {token.key}")
        except Token.DoesNotExist:
            print(f"  USER: {user.username}, NO TOKEN")

    # Check clients
    clients = Client.objects.all()
    print(f"\nCLIENTS COUNT: {clients.count()}")
    for client in clients[:3]:  # Show first 3
        print(f"  ID={client.id}, NAME={client.first_name} {client.last_name}")

    # Test appointment data
    if services.exists() and users.exists() and clients.exists():
        service = services.first()
        user = users.first()
        client = clients.first()

        appointment_data = {
            "client": client.id,
            "scheduled_date": "2024-06-15",
            "scheduled_time": "14:00:00",
            "duration": 60,
            "services": [service.id],
            "notes": "Test appointment",
        }

        print(f"\nTEST APPOINTMENT DATA:")
        print(json.dumps(appointment_data, indent=2))

except Exception as e:
    print(f"ERROR: {e}")
    import traceback

    traceback.print_exc()
