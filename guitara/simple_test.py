import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from scheduling.models import Appointment, TherapistConfirmation
from core.models import CustomUser

print("=== APPOINTMENT ANALYSIS ===")
print(f"Total appointments: {Appointment.objects.count()}")

for apt in Appointment.objects.all()[:5]:
    print(f"\nID: {apt.id}")
    print(f"Status: {apt.status}")
    print(f"Group Size: {apt.group_size}")
    print(f"Requires Car: {apt.requires_car}")
    print(f"Therapists: {apt.therapists.count()}")

    if apt.group_size > 1:
        confirmations = TherapistConfirmation.objects.filter(
            appointment=apt, confirmed_at__isnull=False
        ).count()
        print(f"Confirmations: {confirmations}/{apt.group_size}")

        if apt.status == "therapist_confirmed" and confirmations < apt.group_size:
            print("❌ ISSUE: Premature status change!")

        if apt.requires_car != True:
            print("❌ ISSUE: Multi-therapist should require car!")

print("\n=== ISSUES FOUND ===")
# Check for wrong requires_car settings
wrong_multi = Appointment.objects.filter(group_size__gt=1, requires_car=False).count()
wrong_single = Appointment.objects.filter(group_size=1, requires_car=True).count()

print(f"Multi-therapist with requires_car=False: {wrong_multi}")
print(f"Single-therapist with requires_car=True: {wrong_single}")
