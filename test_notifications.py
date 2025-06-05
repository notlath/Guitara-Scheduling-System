#!/usr/bin/env python3
"""
Test the appointment notification system
"""
import os
import sys
import django

# Set up Django environment
sys.path.append('/home/notlath/Downloads/Guitara-Scheduling-System/guitara')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

from django.test import Client
from core.models import CustomUser
from scheduling.models import Appointment, Client as SchedulingClient, Service
from django.utils import timezone
from datetime import datetime, date, time
import json

def test_notification_system():
    print("🧪 Testing Appointment Notification System")
    print("=" * 50)
    
    # 1. Check if users exist
    print("\n1. Checking users...")
    users = CustomUser.objects.all()
    print(f"   Found {users.count()} users in database")
    
    therapists = CustomUser.objects.filter(role='therapist')
    operators = CustomUser.objects.filter(role='operator')
    
    print(f"   Therapists: {therapists.count()}")
    print(f"   Operators: {operators.count()}")
    
    for therapist in therapists:
        print(f"     - {therapist.username} (ID: {therapist.id})")
    
    # 2. Check existing appointments
    print("\n2. Checking appointments...")
    appointments = Appointment.objects.all()
    print(f"   Found {appointments.count()} appointments")
    
    # Show recent appointments
    recent_appointments = Appointment.objects.order_by('-created_at')[:3]
    for apt in recent_appointments:
        therapist_name = apt.therapist.get_full_name() if apt.therapist else "No therapist"
        print(f"     - ID: {apt.id}, Status: {apt.status}, Therapist: {therapist_name}, Date: {apt.date}")
    
    # 3. Check services
    print("\n3. Checking services...")
    services = Service.objects.filter(is_active=True)
    print(f"   Found {services.count()} active services")
    
    # 4. Check clients
    print("\n4. Checking clients...")
    clients = SchedulingClient.objects.all()
    print(f"   Found {clients.count()} clients")
    
    # 5. Test WebSocket setup
    print("\n5. Testing WebSocket configuration...")
    try:
        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        print(f"   ✓ Channel layer configured: {channel_layer.__class__.__name__}")
    except Exception as e:
        print(f"   ✗ Channel layer error: {e}")
    
    try:
        from scheduling.consumers import AppointmentConsumer
        print("   ✓ AppointmentConsumer found")
    except ImportError as e:
        print(f"   ✗ AppointmentConsumer not found: {e}")
    
    # 6. Check ASGI configuration
    print("\n6. Checking ASGI configuration...")
    try:
        from guitara.asgi import application
        print("   ✓ ASGI application configured")
    except Exception as e:
        print(f"   ✗ ASGI configuration error: {e}")
    
    # 7. Test appointment creation (if we have the necessary data)
    if therapists.exists() and clients.exists() and services.exists():
        print("\n7. Testing appointment creation...")
        try:
            client = clients.first()
            therapist = therapists.first()
            service = services.first()
            
            appointment = Appointment.objects.create(
                client=client,
                therapist=therapist,
                date=date.today(),
                start_time=time(14, 0),  # 2:00 PM
                end_time=time(15, 0),    # 3:00 PM
                status='pending',
                location='Test Location'
            )
            appointment.services.add(service)
            
            print(f"   ✓ Test appointment created (ID: {appointment.id})")
            print(f"     - Client: {client.get_full_name()}")
            print(f"     - Therapist: {therapist.get_full_name()}")
            print(f"     - Service: {service.name}")
            print(f"     - Status: {appointment.status}")
            
            # This should trigger the signal that sends WebSocket notifications
            print("   📡 WebSocket notification should have been sent via post_save signal")
            
        except Exception as e:
            print(f"   ✗ Failed to create test appointment: {e}")
    else:
        print("\n7. Skipping appointment creation test - missing required data")
        if not therapists.exists():
            print("     - No therapists found")
        if not clients.exists():
            print("     - No clients found")
        if not services.exists():
            print("     - No services found")
    
    print("\n" + "=" * 50)
    print("🏁 Test completed!")
    print("\nTo test the frontend notifications:")
    print("1. Open http://localhost:5173 in browser")
    print("2. Login as a therapist")
    print("3. Check the TherapistDashboard for notifications")
    print("4. Create a new appointment and see if notifications appear")

if __name__ == "__main__":
    test_notification_system()
