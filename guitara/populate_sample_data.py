#!/usr/bin/env python
"""
Populate sample data for testing the scheduling system
"""
import os
import sys
import django
from datetime import datetime, timedelta, time
from django.utils import timezone

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from django.contrib.auth import get_user_model
from scheduling.models import Client, Appointment
from registration.models import Service

User = get_user_model()


def create_sample_data():
    print("🔄 Creating sample data for testing...")

    # Create users if they don't exist
    try:
        operator = User.objects.get(username="operator1")
    except User.DoesNotExist:
        operator = User.objects.create_user(
            username="operator1",
            email="operator@guitara.com",
            password="password123",
            first_name="John",
            last_name="Operator",
            role="operator",
        )
        print("✅ Created operator user")

    try:
        therapist1 = User.objects.get(username="therapist1")
    except User.DoesNotExist:
        therapist1 = User.objects.create_user(
            username="therapist1",
            email="therapist1@guitara.com",
            password="password123",
            first_name="Sarah",
            last_name="Therapist",
            role="therapist",
        )
        print("✅ Created therapist1 user")

    try:
        therapist2 = User.objects.get(username="therapist2")
    except User.DoesNotExist:
        therapist2 = User.objects.create_user(
            username="therapist2",
            email="therapist2@guitara.com",
            password="password123",
            first_name="Mike",
            last_name="Healer",
            role="therapist",
        )
        print("✅ Created therapist2 user")

    try:
        driver1 = User.objects.get(username="driver1")
    except User.DoesNotExist:
        driver1 = User.objects.create_user(
            username="driver1",
            email="driver1@guitara.com",
            password="password123",
            first_name="Alex",
            last_name="Driver",
            role="driver",
        )
        print("✅ Created driver1 user")

    # Create services if they don't exist
    services_data = [
        {"name": "Swedish Massage", "duration": timedelta(hours=1), "price": 100.0},
        {
            "name": "Deep Tissue Massage",
            "duration": timedelta(hours=1, minutes=30),
            "price": 150.0,
        },
        {
            "name": "Hot Stone Massage",
            "duration": timedelta(hours=1, minutes=15),
            "price": 130.0,
        },
        {"name": "Aromatherapy", "duration": timedelta(minutes=45), "price": 80.0},
        {"name": "Thai Massage", "duration": timedelta(hours=2), "price": 200.0},
    ]

    services = []
    for service_data in services_data:
        service, created = Service.objects.get_or_create(
            name=service_data["name"],
            defaults={
                "duration": service_data["duration"],
                "price": service_data["price"],
                "description": f'Professional {service_data["name"]} service',
            },
        )
        services.append(service)
        if created:
            print(f"✅ Created service: {service.name}")

    # Create clients if they don't exist
    clients_data = [
        {
            "first_name": "Emma",
            "last_name": "Johnson",
            "phone": "555-0101",
            "email": "emma.j@email.com",
        },
        {
            "first_name": "Michael",
            "last_name": "Brown",
            "phone": "555-0102",
            "email": "mike.b@email.com",
        },
        {
            "first_name": "Sophia",
            "last_name": "Davis",
            "phone": "555-0103",
            "email": "sophia.d@email.com",
        },
        {
            "first_name": "William",
            "last_name": "Wilson",
            "phone": "555-0104",
            "email": "will.w@email.com",
        },
        {
            "first_name": "Olivia",
            "last_name": "Garcia",
            "phone": "555-0105",
            "email": "olivia.g@email.com",
        },
        {
            "first_name": "James",
            "last_name": "Miller",
            "phone": "555-0106",
            "email": "james.m@email.com",
        },
        {
            "first_name": "Ava",
            "last_name": "Martinez",
            "phone": "555-0107",
            "email": "ava.m@email.com",
        },
        {
            "first_name": "Benjamin",
            "last_name": "Anderson",
            "phone": "555-0108",
            "email": "ben.a@email.com",
        },
    ]

    clients = []
    for client_data in clients_data:
        client, created = Client.objects.get_or_create(
            phone_number=client_data["phone"],
            defaults={
                "first_name": client_data["first_name"],
                "last_name": client_data["last_name"],
                "email": client_data["email"],
                "address": f'{client_data["first_name"]} {client_data["last_name"]} Address, City, State 12345',
            },
        )
        clients.append(client)
        if created:
            print(f"✅ Created client: {client.first_name} {client.last_name}")

    # Create sample appointments with various statuses
    today = timezone.now().date()
    appointments_data = [
        # Pending appointments (need operator attention)
        {
            "client": clients[0],
            "therapist": therapist1,
            "driver": driver1,
            "date": today,
            "start_time": time(9, 0),
            "status": "pending",
            "location": "123 Main St, Anytown, ST 12345",
            "services": [services[0]],  # Swedish Massage
        },
        {
            "client": clients[1],
            "therapist": therapist2,
            "driver": driver1,
            "date": today,
            "start_time": time(11, 0),
            "status": "pending",
            "location": "456 Oak Ave, Anytown, ST 12345",
            "services": [services[1]],  # Deep Tissue
        },
        # Rejected appointments (need operator review)
        {
            "client": clients[2],
            "therapist": therapist1,
            "driver": driver1,
            "date": today + timedelta(days=1),
            "start_time": time(10, 0),
            "status": "rejected",
            "location": "789 Pine Rd, Anytown, ST 12345",
            "services": [services[2]],  # Hot Stone
            "rejection_reason": "Schedule conflict with existing appointment",
            "rejected_by": therapist1,
            "rejected_at": timezone.now() - timedelta(hours=2),
        },
        # Confirmed appointments
        {
            "client": clients[3],
            "therapist": therapist2,
            "driver": driver1,
            "date": today + timedelta(days=1),
            "start_time": time(14, 0),
            "status": "confirmed",
            "location": "321 Elm St, Anytown, ST 12345",
            "services": [services[0], services[3]],  # Multiple services
        },
        # In progress appointments
        {
            "client": clients[4],
            "therapist": therapist1,
            "driver": driver1,
            "date": today,
            "start_time": time(13, 0),
            "status": "in_progress",
            "location": "654 Maple Dr, Anytown, ST 12345",
            "services": [services[4]],  # Thai Massage
        },
        # Awaiting payment
        {
            "client": clients[5],
            "therapist": therapist2,
            "driver": driver1,
            "date": today,
            "start_time": time(8, 0),
            "status": "awaiting_payment",
            "location": "987 Cedar Ln, Anytown, ST 12345",
            "services": [services[1]],
            "payment_amount": 150.0,
        },
        # Completed appointments
        {
            "client": clients[6],
            "therapist": therapist1,
            "driver": driver1,
            "date": today - timedelta(days=1),
            "start_time": time(15, 0),
            "status": "completed",
            "location": "147 Birch Way, Anytown, ST 12345",
            "services": [services[0]],
            "payment_status": "paid",
            "payment_amount": 100.0,
        },
        # Future appointments
        {
            "client": clients[7],
            "therapist": therapist2,
            "driver": driver1,
            "date": today + timedelta(days=2),
            "start_time": time(16, 0),
            "status": "confirmed",
            "location": "258 Spruce St, Anytown, ST 12345",
            "services": [services[2]],
        },
    ]

    created_count = 0
    for apt_data in appointments_data:
        # Check if appointment already exists
        existing = Appointment.objects.filter(
            client=apt_data["client"],
            date=apt_data["date"],
            start_time=apt_data["start_time"],
        ).first()

        if not existing:
            appointment = Appointment.objects.create(
                client=apt_data["client"],
                therapist=apt_data["therapist"],
                driver=apt_data["driver"],
                operator=operator,
                date=apt_data["date"],
                start_time=apt_data["start_time"],
                status=apt_data["status"],
                location=apt_data["location"],
                payment_status=apt_data.get("payment_status", "unpaid"),
                payment_amount=apt_data.get("payment_amount", 0),
                rejection_reason=apt_data.get("rejection_reason", ""),
                rejected_by=apt_data.get("rejected_by"),
                rejected_at=apt_data.get("rejected_at"),
            )

            # Add services (many-to-many relationship)
            for service in apt_data["services"]:
                appointment.services.add(service)

            created_count += 1
            print(
                f"✅ Created appointment: {appointment.client.first_name} {appointment.client.last_name} - {appointment.date} {appointment.start_time} ({appointment.status})"
            )

    total_appointments = Appointment.objects.count()
    print(f"\n📊 Sample data creation complete!")
    print(f"   📄 Total appointments in database: {total_appointments}")
    print(f"   📝 New appointments created: {created_count}")
    print(f"   👥 Users: {User.objects.count()}")
    print(f"   🏢 Clients: {Client.objects.count()}")
    print(f"   🛠️ Services: {Service.objects.count()}")

    # Show status breakdown
    print(f"\n📈 Appointment status breakdown:")
    statuses = Appointment.objects.values_list("status", flat=True)
    status_counts = {}
    for status in statuses:
        status_counts[status] = status_counts.get(status, 0) + 1

    for status, count in status_counts.items():
        print(f"   - {status}: {count}")


if __name__ == "__main__":
    create_sample_data()
