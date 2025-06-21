#!/usr/bin/env python
"""
Simple check for appointment count
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from scheduling.models import Appointment

try:
    count = Appointment.objects.count()
    print(f"Total appointments in database: {count}")

    if count == 0:
        print("Creating a simple test appointment...")
        from django.contrib.auth import get_user_model
        from scheduling.models import Client
        from registration.models import Service
        from datetime import datetime, time
        from django.utils import timezone

        User = get_user_model()

        # Get or create a simple client
        client, created = Client.objects.get_or_create(
            phone_number="555-TEST",
            defaults={
                "first_name": "Test",
                "last_name": "Client",
                "email": "test@test.com",
                "address": "Test Address",
            },
        )

        # Get or create a service
        service, created = Service.objects.get_or_create(
            name="Test Service",
            defaults={
                "duration": timezone.timedelta(hours=1),
                "price": 100.0,
                "description": "Test service",
            },
        )

        # Create a simple appointment
        appointment = Appointment.objects.create(
            client=client,
            date=timezone.now().date(),
            start_time=time(10, 0),
            status="pending",
            location="Test Location",
        )
        appointment.services.add(service)

        print(f"✅ Created test appointment with ID: {appointment.id}")
        print(f"   Status: {appointment.status}")
        print(f"   Client: {appointment.client}")
        print(f"   Date: {appointment.date}")
    else:
        print("Appointments exist! Showing first few:")
        for apt in Appointment.objects.all()[:5]:
            print(f"   - {apt.id}: {apt.client} on {apt.date} ({apt.status})")

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback

    traceback.print_exc()
