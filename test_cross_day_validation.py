#!/usr/bin/env python
"""
Test script to verify cross-day availability validation works properly.
This tests the new cross-day logic in appointment creation.
"""

import os
import sys
import django
from datetime import date, time, timedelta

# Add the guitara directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'guitara'))

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

from scheduling.models import Availability, Appointment, CustomUser, Client
from registration.models import Service
from scheduling.serializers import AppointmentSerializer
from django.utils import timezone


def test_cross_day_availability_validation():
    """Test that cross-day availability validation works correctly."""
    print("🔄 Testing cross-day availability validation...")
    
    try:
        # Create test therapist
        therapist = CustomUser.objects.create_user(
            username='test_therapist_cross_day',
            email='test_therapist@example.com',
            password='testpass123',
            role='therapist',
            first_name='Test',
            last_name='Therapist'
        )
        
        # Create test client
        client = Client.objects.create(
            first_name='Test',
            last_name='Client',
            email='test_client@example.com',
            phone='123-456-7890',
            address='123 Test St'
        )
        
        # Create test service
        service = Service.objects.create(
            name='Test Massage',
            duration=60,
            price=100.00
        )
        
        test_date = date.today()
        
        # Create cross-day availability: 13:00 to 01:00 (next day)
        availability = Availability.objects.create(
            user=therapist,
            date=test_date,
            start_time=time(13, 0),  # 1:00 PM
            end_time=time(1, 0),     # 1:00 AM next day
            is_available=True
        )
        
        print(f"✅ Created cross-day availability: {availability}")
        
        # Test 1: Appointment during same-day portion (e.g., 14:00-15:00)
        print("\n🧪 Test 1: Appointment during same-day portion (14:00-15:00)")
        appointment_data = {
            'client': client.id,
            'therapist': therapist.id,
            'services': [service.id],
            'date': test_date,
            'start_time': time(14, 0),  # 2:00 PM
            'end_time': time(15, 0),    # 3:00 PM
            'location': 'Test Location',
            'notes': 'Test appointment same-day'
        }
        
        serializer = AppointmentSerializer(data=appointment_data)
        if serializer.is_valid():
            appointment = serializer.save(operator=therapist)
            print(f"✅ Same-day appointment created successfully: {appointment}")
            appointment.delete()  # Clean up
        else:
            print(f"❌ Same-day appointment validation failed: {serializer.errors}")
        
        # Test 2: Appointment during cross-day portion (e.g., 00:30-01:30 next day)
        print("\n🧪 Test 2: Appointment during cross-day portion (00:30-01:30 next day)")
        next_day = test_date + timedelta(days=1)
        appointment_data = {
            'client': client.id,
            'therapist': therapist.id,
            'services': [service.id],
            'date': next_day,  # Next day
            'start_time': time(0, 30),   # 12:30 AM
            'end_time': time(1, 30),     # 1:30 AM
            'location': 'Test Location',
            'notes': 'Test appointment cross-day'
        }
        
        serializer = AppointmentSerializer(data=appointment_data)
        if serializer.is_valid():
            appointment = serializer.save(operator=therapist)
            print(f"✅ Cross-day appointment created successfully: {appointment}")
            appointment.delete()  # Clean up
        else:
            print(f"❌ Cross-day appointment validation failed: {serializer.errors}")
        
        # Test 3: Appointment outside availability (should fail)
        print("\n🧪 Test 3: Appointment outside availability (10:00-11:00) - should fail")
        appointment_data = {
            'client': client.id,
            'therapist': therapist.id,
            'services': [service.id],
            'date': test_date,
            'start_time': time(10, 0),  # 10:00 AM - outside availability
            'end_time': time(11, 0),    # 11:00 AM
            'location': 'Test Location',
            'notes': 'Test appointment outside availability'
        }
        
        serializer = AppointmentSerializer(data=appointment_data)
        if serializer.is_valid():
            print(f"❌ Appointment outside availability should have failed but didn't!")
        else:
            print(f"✅ Appointment correctly rejected outside availability: {serializer.errors}")
        
        print(f"\n🧹 Cleaning up test data...")
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Clean up test data
        try:
            CustomUser.objects.filter(username='test_therapist_cross_day').delete()
            Client.objects.filter(email='test_client@example.com').delete()
            Service.objects.filter(name='Test Massage').delete()
            print("✅ Test data cleaned up")
        except Exception as e:
            print(f"⚠️ Cleanup error: {e}")


if __name__ == "__main__":
    test_cross_day_availability_validation()
