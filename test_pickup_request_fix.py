"""
Test script to verify pickup request functionality works with updated status choices.
"""

import os
import sys
import django

# Add the Django project to the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'guitara'))

# Django setup
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

from scheduling.models import Appointment
from scheduling.serializers import AppointmentSerializer

def test_pickup_request_status():
    """Test that pickup_requested status is now valid."""
    print("🧪 Testing pickup request status validation...")
    
    # Test data that should now work
    test_data = {
        'status': 'pickup_requested',
        'notes': 'Pickup requested by therapist'
    }
    
    # Check if the status is in the valid choices
    valid_statuses = [choice[0] for choice in Appointment.STATUS_CHOICES]
    print(f"📋 Available statuses: {valid_statuses}")
    
    if 'pickup_requested' in valid_statuses:
        print("✅ 'pickup_requested' status is now available in model choices")
    else:
        print("❌ 'pickup_requested' status is still missing from model choices")
        return False
    
    # Test serializer validation
    try:
        # Create a mock appointment instance
        appointment = Appointment(
            status='completed',
            client_id=1,
            therapist_id=1,
            date='2024-01-01',
            start_time='10:00:00',
            end_time='11:00:00',
            location='Test Location'
        )
        
        serializer = AppointmentSerializer(appointment, data=test_data, partial=True)
        if serializer.is_valid():
            print("✅ Serializer validation passed for pickup_requested status")
            print(f"   Validated data: {serializer.validated_data}")
            return True
        else:
            print(f"❌ Serializer validation failed: {serializer.errors}")
            return False
    except Exception as e:
        print(f"❌ Exception during serialization: {e}")
        return False

def test_other_driver_statuses():
    """Test other driver-related statuses."""
    print("\n🧪 Testing other driver-related statuses...")
    
    driver_statuses = [
        'driver_assigned',
        'driving_to_location', 
        'at_location',
        'therapist_dropped_off',
        'transport_completed'
    ]
    
    valid_statuses = [choice[0] for choice in Appointment.STATUS_CHOICES]
    
    all_valid = True
    for status in driver_statuses:
        if status in valid_statuses:
            print(f"✅ '{status}' status is available")
        else:
            print(f"❌ '{status}' status is missing")
            all_valid = False
    
    return all_valid

if __name__ == "__main__":
    print("🧪 Testing Pickup Request Fix\n")
    print("=" * 50)
    
    result1 = test_pickup_request_status()
    result2 = test_other_driver_statuses()
    
    print("\n" + "=" * 50)
    if result1 and result2:
        print("✅ All tests passed! Pickup request should now work.")
    else:
        print("❌ Some tests failed. There may still be issues.")
