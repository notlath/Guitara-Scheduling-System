#!/usr/bin/env python
"""
Quick test to verify the system is working correctly
"""
import os
import sys
import django

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

from django.contrib.auth import get_user_model
from scheduling.models import Appointment
from rest_framework.test import APIClient

def quick_test():
    """Quick test to verify key functionality"""
    print("🔍 Quick system verification...")
    
    try:
        # Test 1: Check that we have users
        User = get_user_model()
        operator_count = User.objects.filter(role='operator').count()
        therapist_count = User.objects.filter(role='therapist').count()
        driver_count = User.objects.filter(role='driver').count()
        
        print(f"✅ Users in system: {operator_count} operators, {therapist_count} therapists, {driver_count} drivers")
        
        # Test 2: Check appointments exist
        appointment_count = Appointment.objects.count()
        print(f"✅ Appointments in system: {appointment_count}")
        
        # Test 3: Test start_session endpoint accessibility
        if therapist_count > 0 and appointment_count > 0:
            therapist = User.objects.filter(role='therapist').first()
            appointment = Appointment.objects.first()
            
            client = APIClient()
            client.force_authenticate(user=therapist)
            
            # Just test that endpoint responds (not 404)
            response = client.post(f'/api/scheduling/appointments/{appointment.id}/start_session/')
            
            if response.status_code == 404:
                print("❌ start_session endpoint still returns 404")
            else:
                print(f"✅ start_session endpoint accessible (status: {response.status_code})")
                
        # Test 4: Import check
        try:
            from scheduling.views import AppointmentViewSet
            print("✅ AppointmentViewSet imports correctly")
        except Exception as e:
            print(f"❌ Import error: {e}")
            
        print("\n🎯 Quick verification completed!")
        return True
        
    except Exception as e:
        print(f"❌ Error during verification: {str(e)}")
        return False

if __name__ == '__main__':
    quick_test()
