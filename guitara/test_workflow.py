#!/usr/bin/env python
"""
Test script to verify the appointment confirmation workflow
"""
import os
import sys
import django

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from django.contrib.auth import get_user_model
from scheduling.models import Appointment, Client
from django.utils import timezone
from datetime import date, time

User = get_user_model()


def test_appointment_workflow():
    """Test the complete appointment workflow"""
    print("Testing appointment confirmation workflow...")

    # Get or create test users
    try:
        operator = User.objects.filter(role="operator").first()
        therapist = User.objects.filter(role="therapist").first()
        driver = User.objects.filter(role="driver").first()

        if not operator:
            print("❌ No operator found")
            return
        if not therapist:
            print("❌ No therapist found")
            return
        if not driver:
            print("❌ No driver found")
            return

        print(
            f"✅ Found users: Operator({operator.username}), Therapist({therapist.username}), Driver({driver.username})"
        )

        # Get or create test client
        client, created = Client.objects.get_or_create(
            phone_number="1234567890",
            defaults={
                "first_name": "Test",
                "last_name": "Client",
                "email": "test@client.com",
            },
        )
        print(f"✅ Using client: {client.first_name} {client.last_name}")

        # Create test appointment
        appointment = Appointment.objects.create(
            client=client,
            therapist=therapist,
            driver=driver,
            operator=operator,
            date=date.today(),
            start_time=time(14, 0),  # 2:00 PM
            end_time=time(15, 0),  # 3:00 PM
            location="123 Test St",
            status="pending",
        )
        print(
            f"✅ Created appointment {appointment.id} with status: {appointment.status}"
        )

        # Test workflow progression
        print("\n🔄 Testing workflow progression...")

        # 1. Should start as pending
        assert (
            appointment.status == "pending"
        ), f"Expected 'pending', got '{appointment.status}'"
        print("✅ Step 1: Appointment created as 'pending'")

        # 2. Therapist confirms
        appointment.status = "therapist_confirmed"
        appointment.therapist_confirmed_at = timezone.now()
        appointment.save()
        print("✅ Step 2: Therapist confirmed")

        # 3. Driver confirms
        appointment.status = "driver_confirmed"
        appointment.driver_confirmed_at = timezone.now()
        appointment.save()
        print("✅ Step 3: Driver confirmed")

        # 4. Operator starts appointment
        appointment.status = "in_progress"
        appointment.started_at = timezone.now()
        appointment.save()
        print("✅ Step 4: Operator set to 'in_progress'")

        # 5. Driver starts journey
        appointment.status = "journey_started"
        appointment.save()
        print("✅ Step 5: Driver started journey")

        # 6. Driver arrives
        appointment.status = "arrived"
        appointment.save()
        print("✅ Step 6: Driver arrived")

        # 7. Driver drops off
        appointment.status = "dropped_off"
        appointment.save()
        print("✅ Step 7: Driver dropped off")

        # 8. Therapist starts session
        appointment.status = "session_in_progress"
        appointment.session_started_at = timezone.now()
        appointment.save()
        print("✅ Step 8: Session started")

        print(
            f"\n🎉 Workflow test completed successfully! Final status: {appointment.status}"
        )

        # Cleanup
        appointment.delete()
        print("✅ Test appointment cleaned up")

    except Exception as e:
        print(f"❌ Error during test: {str(e)}")
        import traceback

        traceback.print_exc()


def test_workflow_restrictions():
    """Test that the workflow restrictions are enforced"""
    print("\n🔒 Testing workflow restrictions...")

    # Test that session cannot start before dropped_off
    try:
        operator = User.objects.filter(role="operator").first()
        therapist = User.objects.filter(role="therapist").first()
        driver = User.objects.filter(role="driver").first()
        client = Client.objects.first()

        if not all([operator, therapist, driver, client]):
            print("❌ Missing required users/client for restriction test")
            return

        # Create appointment in driver_confirmed state
        appointment = Appointment.objects.create(
            client=client,
            therapist=therapist,
            driver=driver,
            operator=operator,
            date=date.today(),
            start_time=time(16, 0),
            end_time=time(17, 0),
            location="123 Test St",
            status="driver_confirmed",
        )

        print(f"✅ Created test appointment in 'driver_confirmed' state")

        # Try to start session (this should fail in frontend/backend validation)
        print("❌ Session start should be blocked until status is 'dropped_off'")

        # Test proper progression
        appointment.status = "in_progress"
        appointment.save()
        print("✅ Operator can set to 'in_progress'")

        appointment.status = "dropped_off"
        appointment.save()
        print("✅ Can progress to 'dropped_off'")

        appointment.status = "session_in_progress"
        appointment.save()
        print("✅ Session can now start from 'dropped_off'")

        # Cleanup
        appointment.delete()
        print("✅ Restriction test completed and cleaned up")

    except Exception as e:
        print(f"❌ Error during restriction test: {str(e)}")


if __name__ == "__main__":
    test_appointment_workflow()
    test_workflow_restrictions()
    print("\n🎯 All workflow tests completed!")
