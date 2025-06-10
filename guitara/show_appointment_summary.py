#!/usr/bin/env python
import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from scheduling.models import Appointment
from core.models import CustomUser


def show_appointment_summary():
    """Show appointment 14 summary and user assignments"""
    try:
        appointment = Appointment.objects.get(id=14)

        print("=" * 60)
        print("📋 APPOINTMENT 14 SUMMARY")
        print("=" * 60)
        print(f"Status: {appointment.status}")
        print(f"Client: {appointment.client}")
        print(
            f"Date: {appointment.date} | Time: {appointment.start_time}-{appointment.end_time}"
        )

        print(f"\n👨‍⚕️ ASSIGNED THERAPISTS:")
        if appointment.therapist:
            print(
                f"  Single therapist: {appointment.therapist.get_full_name()} (ID: {appointment.therapist.id})"
            )

        therapists = appointment.therapists.all()
        if therapists:
            print(f"  Many-to-many therapists:")
            for therapist in therapists:
                print(
                    f"    - {therapist.get_full_name()} (ID: {therapist.id}, Username: {therapist.username})"
                )

        if appointment.driver:
            print(f"\n🚗 ASSIGNED DRIVER:")
            print(
                f"  {appointment.driver.get_full_name()} (ID: {appointment.driver.id}, Username: {appointment.driver.username})"
            )

        print(f"\n🔐 USERS WITH PERMISSION TO COMPLETE:")

        # List assigned therapists
        if appointment.therapist:
            print(
                f"  ✅ Therapist: {appointment.therapist.username} (ID: {appointment.therapist.id})"
            )
        for therapist in therapists:
            print(f"  ✅ Therapist: {therapist.username} (ID: {therapist.id})")

        # List assigned driver
        if appointment.driver:
            print(
                f"  ✅ Driver: {appointment.driver.username} (ID: {appointment.driver.id})"
            )

        # List operators
        operators = CustomUser.objects.filter(role="operator")
        for operator in operators:
            print(f"  ✅ Operator: {operator.username} (ID: {operator.id})")

        print(f"\n❌ USERS WITHOUT PERMISSION:")
        all_therapists = CustomUser.objects.filter(role="therapist")
        assigned_therapist_ids = [t.id for t in therapists]
        if appointment.therapist:
            assigned_therapist_ids.append(appointment.therapist.id)

        unassigned_therapists = all_therapists.exclude(id__in=assigned_therapist_ids)
        for therapist in unassigned_therapists:
            print(f"  ❌ Therapist: {therapist.username} (ID: {therapist.id})")

        print(f"\n💡 SOLUTION:")
        print(f"The logged-in user must be one of:")
        valid_users = []
        if appointment.therapist:
            valid_users.append(
                f"{appointment.therapist.username} (ID: {appointment.therapist.id})"
            )
        for therapist in therapists:
            valid_users.append(f"{therapist.username} (ID: {therapist.id})")
        if appointment.driver:
            valid_users.append(
                f"{appointment.driver.username} (ID: {appointment.driver.id})"
            )
        for operator in operators:
            valid_users.append(f"{operator.username} (ID: {operator.id})")

        for user in valid_users:
            print(f"  - {user}")

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    show_appointment_summary()
