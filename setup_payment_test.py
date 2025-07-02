#!/usr/bin/env python
import os
import sys
import django
from datetime import datetime, time

# Add the directory containing manage.py to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'guitara'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

from scheduling.models import Appointment, AppointmentMaterial
from inventory.models import InventoryItem
from core.models import CustomUser

print("=== Setting up Test Appointment for Payment Modal ===")

# Find or use existing appointment ID 65 that's in therapist_confirmed status
appointment = Appointment.objects.get(id=65)
print(f"Found appointment: {appointment.id} - Status: {appointment.status}")

# Change status to session_in_progress to test payment request
appointment.status = 'session_in_progress'
appointment.save()
print(f"Updated appointment status to: {appointment.status}")

# Check materials for this appointment
materials = appointment.appointment_materials.all()
print(f"Materials for this appointment:")
for material in materials:
    print(f"  - {material.inventory_item.name}: {material.quantity_used} {material.inventory_item.unit}")
    print(f"    Current inventory - Stock: {material.inventory_item.current_stock}, In Use: {material.inventory_item.in_use}, Empty: {material.inventory_item.empty}")

print("\n✅ Test setup complete!")
print(f"🎯 Use appointment ID {appointment.id} to test the payment request modal")
print("📱 Login as therapist and request payment to see the material status modal")
