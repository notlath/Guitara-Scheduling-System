#!/usr/bin/env python
"""
Debug script to check rejected appointments in the database
"""
import os
import sys
import django

# Add the project root to Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "guitara"))

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from scheduling.models import Appointment
from django.db.models import Q


def debug_rejected_appointments():
    print("🔍 Debugging Rejected Appointments\n")

    # Check all appointments with status "rejected"
    rejected_appointments = Appointment.objects.filter(status="rejected")
    print(
        f"📊 Total appointments with status='rejected': {rejected_appointments.count()}"
    )

    # Check appointments with rejection_reason containing "therapist"
    therapist_rejections = Appointment.objects.filter(
        Q(rejection_reason__icontains="therapist") & Q(status="rejected")
    )
    print(
        f"📊 Rejected by therapist (status='rejected' + rejection_reason contains 'therapist'): {therapist_rejections.count()}"
    )

    # Check all appointments with rejection_reason containing "therapist" regardless of status
    all_therapist_rejections = Appointment.objects.filter(
        rejection_reason__icontains="therapist"
    )
    print(
        f"📊 All appointments with rejection_reason containing 'therapist': {all_therapist_rejections.count()}"
    )

    # Check if there are any appointments with rejection_reason but different status
    rejection_reason_but_not_rejected = Appointment.objects.filter(
        rejection_reason__isnull=False
    ).exclude(status="rejected")
    print(
        f"📊 Appointments with rejection_reason but status != 'rejected': {rejection_reason_but_not_rejected.count()}"
    )

    print("\n📋 Detailed Analysis:")

    # Show all appointments with rejection_reason
    all_with_rejection_reason = Appointment.objects.filter(
        rejection_reason__isnull=False
    ).exclude(rejection_reason="")

    print(
        f"\n🔎 All appointments with rejection_reason ({all_with_rejection_reason.count()} total):"
    )
    for apt in all_with_rejection_reason:
        print(
            f"  ID: {apt.id}, Status: {apt.status}, Rejection Reason: {apt.rejection_reason[:50]}{'...' if len(apt.rejection_reason) > 50 else ''}"
        )

    if rejected_appointments.exists():
        print(
            f"\n✅ Rejected appointments found ({rejected_appointments.count()} total):"
        )
        for apt in rejected_appointments:
            print(
                f"  ID: {apt.id}, Status: {apt.status}, Rejection Reason: {apt.rejection_reason or 'None'}"
            )
    else:
        print(f"\n❌ No appointments found with status='rejected'")

    # Check recent appointments for debugging
    recent_appointments = Appointment.objects.all().order_by("-created_at")[:10]
    print(f"\n📅 Recent 10 appointments (for context):")
    for apt in recent_appointments:
        print(
            f"  ID: {apt.id}, Status: {apt.status}, Created: {apt.created_at}, Rejection Reason: {apt.rejection_reason or 'None'}"
        )


if __name__ == "__main__":
    debug_rejected_appointments()
