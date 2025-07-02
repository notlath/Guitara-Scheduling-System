#!/usr/bin/env python
import os
import sys
import django

# Add the directory containing manage.py to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'guitara'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

from scheduling.models import Appointment, AppointmentMaterial
from inventory.models import InventoryItem

print("=== Checking Appointments with Materials ===")
appointments = Appointment.objects.filter(appointment_materials__isnull=False).distinct()
print(f"Total appointments with materials: {appointments.count()}")

for apt in appointments[:5]:
    print(f"\n--- Appointment ID: {apt.id} ---")
    print(f"Status: {apt.status}")
    print(f"Date: {apt.date}")
    print(f"Therapist: {apt.therapist.get_full_name() if apt.therapist else 'None'}")
    services = apt.services.all()
    print(f"Services: {', '.join([s.name for s in services]) if services else 'None'}")
    print(f"Materials count: {apt.appointment_materials.count()}")
    
    for material in apt.appointment_materials.all():
        print(f"  - {material.inventory_item.name}: {material.quantity_used} {material.inventory_item.unit}")

print("\n=== Checking Inventory Items Status ===")
items = InventoryItem.objects.all()[:5]
for item in items:
    print(f"\n{item.name}:")
    print(f"  Current Stock: {item.current_stock}")
    print(f"  In Use: {item.in_use}")
    print(f"  Empty: {item.empty}")
