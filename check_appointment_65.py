#!/usr/bin/env python
import os
import sys
import django

# Add the directory containing manage.py to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'guitara'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

from scheduling.models import Appointment

print("=== Checking Appointment 65 Status ===")

try:
    appointment = Appointment.objects.get(id=65)
    print(f"Appointment ID: {appointment.id}")
    print(f"Current Status: {appointment.status}")
    print(f"Client: {appointment.client.first_name} {appointment.client.last_name}" if appointment.client else 'None')
    print(f"Therapist: {appointment.therapist.get_full_name() if appointment.therapist else 'None'}")
    print(f"Date: {appointment.date}")
    print(f"Start Time: {appointment.start_time}")
    
    # Check if it has materials
    materials_count = appointment.appointment_materials.count()
    print(f"Materials Count: {materials_count}")
    
    if materials_count > 0:
        print("Materials:")
        for material in appointment.appointment_materials.all():
            print(f"  - {material.inventory_item.name}: {material.quantity_used} {material.inventory_item.unit}")
            
except Appointment.DoesNotExist:
    print("❌ Appointment 65 not found!")

print("\n=== All Appointment Statuses ===")
statuses = Appointment.objects.values_list('status', flat=True).distinct()
for status in statuses:
    count = Appointment.objects.filter(status=status).count()
    print(f"{status}: {count} appointments")
