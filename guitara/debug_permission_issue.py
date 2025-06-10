#!/usr/bin/env python
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from scheduling.models import Appointment
from django.contrib.auth.models import User
from core.models import CustomUser


def debug_appointment_14():
    """Debug appointment 14 and user permissions"""
    try:
        print("=== DEBUGGING APPOINTMENT 14 PERMISSION ISSUE ===")

        # Get appointment 14
        appointment = Appointment.objects.get(id=14)
        print(f"✅ Found appointment 14")
        print(f"   ID: {appointment.id}")
        print(f"   Status: {appointment.status}")
        print(f"   Client: {appointment.client}")
        print(f"   Date: {appointment.date}")
        print(f"   Time: {appointment.start_time} - {appointment.end_time}")

        # Check assigned therapist (single)
        print(f"\n📋 THERAPIST ASSIGNMENTS:")
        print(f"   Single therapist: {appointment.therapist}")
        if appointment.therapist:
            print(f"   Therapist ID: {appointment.therapist.id}")
            print(f"   Therapist name: {appointment.therapist.get_full_name()}")
            print(
                f"   Therapist role: {getattr(appointment.therapist, 'role', 'No role')}"
            )

        # Check assigned therapists (many-to-many)
        therapists = appointment.therapists.all()
        print(f"   M2M therapists count: {therapists.count()}")
        for i, therapist in enumerate(therapists):
            print(
                f"   Therapist {i+1}: {therapist.get_full_name()} (ID: {therapist.id}, Role: {getattr(therapist, 'role', 'No role')})"
            )

        # Check driver assignment
        print(f"\n🚗 DRIVER ASSIGNMENT:")
        print(f"   Driver: {appointment.driver}")
        if appointment.driver:
            print(f"   Driver ID: {appointment.driver.id}")
            print(f"   Driver name: {appointment.driver.get_full_name()}")
            print(f"   Driver role: {getattr(appointment.driver, 'role', 'No role')}")

        # List all users with therapist role
        print(f"\n👨‍⚕️ ALL THERAPIST USERS:")
        therapist_users = CustomUser.objects.filter(role="therapist")
        for user in therapist_users:
            print(
                f"   ID {user.id}: {user.username} - {user.get_full_name()} (Active: {user.is_active})"
            )

        # List all users with operator role
        print(f"\n👩‍💼 ALL OPERATOR USERS:")
        operator_users = CustomUser.objects.filter(role="operator")
        for user in operator_users:
            print(
                f"   ID {user.id}: {user.username} - {user.get_full_name()} (Active: {user.is_active})"
            )

        # List all users with driver role
        print(f"\n🚗 ALL DRIVER USERS:")
        driver_users = CustomUser.objects.filter(role="driver")
        for user in driver_users:
            print(
                f"   ID {user.id}: {user.username} - {user.get_full_name()} (Active: {user.is_active})"
            )

        return appointment

    except Appointment.DoesNotExist:
        print("❌ Appointment 14 does not exist")
        return None
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()
        return None


def test_permission_logic(appointment, test_user_id):
    """Test the permission logic for a specific user"""
    try:
        user = CustomUser.objects.get(id=test_user_id)
        print(f"\n🧪 TESTING PERMISSIONS FOR USER {user.id} ({user.username}):")
        print(f"   User role: {getattr(user, 'role', 'No role')}")

        # Replicate the permission logic from the view
        is_assigned_therapist = (
            user == appointment.therapist
            or appointment.therapists.filter(id=user.id).exists()
        )

        print(f"   user == appointment.therapist: {user == appointment.therapist}")
        print(
            f"   appointment.therapists.filter(id=user.id).exists(): {appointment.therapists.filter(id=user.id).exists()}"
        )
        print(f"   is_assigned_therapist: {is_assigned_therapist}")
        print(
            f"   user.role != 'operator': {getattr(user, 'role', None) != 'operator'}"
        )
        print(f"   user != appointment.driver: {user != appointment.driver}")

        # Final permission check
        has_permission = not (
            getattr(user, "role", None) != "operator"
            and not is_assigned_therapist
            and user != appointment.driver
        )

        print(f"   🔐 FINAL PERMISSION: {has_permission}")

        return has_permission

    except CustomUser.DoesNotExist:
        print(f"❌ User {test_user_id} does not exist")
        return False
    except Exception as e:
        print(f"❌ Error testing permissions: {e}")
        return False


if __name__ == "__main__":
    appointment = debug_appointment_14()

    if appointment:
        print(f"\n" + "=" * 60)
        print("🧪 TESTING PERMISSION LOGIC FOR DIFFERENT USERS")
        print("=" * 60)

        # Test all therapist users
        therapist_users = CustomUser.objects.filter(role="therapist")
        for user in therapist_users:
            test_permission_logic(appointment, user.id)

        # Test all operator users
        operator_users = CustomUser.objects.filter(role="operator")
        for user in operator_users:
            test_permission_logic(appointment, user.id)
