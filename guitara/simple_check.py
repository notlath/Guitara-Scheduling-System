#!/usr/bin/env python
import os
import sys
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from registration.models import Service
from scheduling.models import Client
from django.contrib.auth import get_user_model

try:
    services = Service.objects.all()
    print(f"SERVICES: {services.count()}")
    for s in services:
        print(f"  ID={s.id}, NAME={s.name}, ACTIVE={s.is_active}")

    User = get_user_model()
    users = User.objects.all()
    print(f"USERS: {users.count()}")

    clients = Client.objects.all()
    print(f"CLIENTS: {clients.count()}")

    # Check if service with ID 1 exists
    try:
        service_1 = Service.objects.get(id=1)
        print(f"SERVICE ID 1 EXISTS: {service_1.name}, ACTIVE: {service_1.is_active}")
    except Service.DoesNotExist:
        print("SERVICE ID 1 DOES NOT EXIST")

    # Check if there are any active services
    active_services = Service.objects.filter(is_active=True)
    print(f"ACTIVE SERVICES: {active_services.count()}")

except Exception as e:
    print(f"ERROR: {e}")
    import traceback

    traceback.print_exc()
