#!/usr/bin/env python
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from scheduling.models import Appointment
from core.models import CustomUser
from registration.models import Service
from scheduling.models import Client
from datetime import date, timedelta


def create_test_appointment_for_user(username):
    """Create a test appointment assigned to the specified user"""
    try:
        # Get the user
        user = CustomUser.objects.get(username=username)
        print(f"Found user: {user.get_full_name()} (ID: {user.id}, Role: {user.role})")

        # Get or create a client
        client, created = Client.objects.get_or_create(
            first_name="Test",
            last_name="Client",
            defaults={"phone_number": "1234567890", "address": "123 Test Street"},
        )

        # Get or create a service
        service, created = Service.objects.get_or_create(
            name="Test Massage",
            defaults={
                "description": "Test massage service",
                "duration": 60,
                "price": 100.00,
            },
        )

        # Create appointment
        appointment = Appointment.objects.create(
            client=client,
            date=date.today() + timedelta(days=1),
            start_time="14:00",
            end_time="15:00",
            location="Test Location",
            status="payment_completed",  # Ready for completion
            notes="Test appointment for payment workflow testing",
        )

        # Add services
        appointment.services.add(service)

        # Assign therapist based on role
        if user.role == "therapist":
            appointment.therapists.add(user)
            print(
                f"✅ Assigned therapist {user.username} to appointment {appointment.id}"
            )
        elif user.role == "driver":
            appointment.driver = user
            appointment.save()
            print(f"✅ Assigned driver {user.username} to appointment {appointment.id}")
        elif user.role == "operator":
            print(f"✅ Operator {user.username} can complete any appointment")

        print(f"\n🎉 CREATED TEST APPOINTMENT:")
        print(f"   ID: {appointment.id}")
        print(f"   Status: {appointment.status}")
        print(f"   Client: {appointment.client}")
        print(f"   Date: {appointment.date}")
        print(f"   Time: {appointment.start_time} - {appointment.end_time}")
        print(f"   Services: {', '.join([s.name for s in appointment.services.all()])}")

        if appointment.therapists.exists():
            print(
                f"   Assigned Therapists: {', '.join([t.get_full_name() for t in appointment.therapists.all()])}"
            )
        if appointment.driver:
            print(f"   Assigned Driver: {appointment.driver.get_full_name()}")

        print(
            f"\n💡 User {username} can now test 'Complete Session' on appointment {appointment.id}"
        )

        return appointment.id

    except CustomUser.DoesNotExist:
        print(f"❌ User '{username}' not found")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        return None


def list_current_users():
    """List available users for testing"""
    print("Available users:")
    users = CustomUser.objects.filter(is_active=True).order_by("role", "id")
    for user in users:
        icon = {"operator": "👑", "therapist": "👨‍⚕️", "driver": "🚗"}.get(
            user.role, "👤"
        )
        print(f"  {icon} {user.username} (ID: {user.id}, Role: {user.role})")


if __name__ == "__main__":
    print("=== CREATE TEST APPOINTMENT FOR CURRENT USER ===\n")

    list_current_users()

    print(f"\nChoose a user to create test appointment for:")
    print("Suggested users for testing:")
    print("  - rc_therapist (assigned to appointment 14)")
    print("  - rc_admin (operator - can complete any appointment)")

    # Create appointments for testing
    test_users = ["rc_therapist", "rc_admin"]
    for username in test_users:
        print(f"\n" + "=" * 50)
        create_test_appointment_for_user(username)
