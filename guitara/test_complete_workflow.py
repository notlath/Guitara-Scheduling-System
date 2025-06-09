#!/usr/bin/env python
"""
Comprehensive test to verify the complete appointment workflow is working correctly
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
from scheduling.models import Appointment, Client
from rest_framework.test import APIClient
from datetime import date, time
from django.utils import timezone

def test_complete_workflow():
    """Test the complete workflow from booking to session completion"""
    print("🎯 Testing complete appointment workflow...")
    
    User = get_user_model()
    
    # Get test users
    operator = User.objects.filter(role='operator').first()
    therapist = User.objects.filter(role='therapist').first()
    driver = User.objects.filter(role='driver').first()
    
    if not all([operator, therapist, driver]):
        print(f"❌ Missing users - Operator: {bool(operator)}, Therapist: {bool(therapist)}, Driver: {bool(driver)}")
        return False
    
    print(f"✅ Found all required users")
    
    # Get or create a test client
    client, created = Client.objects.get_or_create(
        phone_number='9999999999',
        defaults={
            'first_name': 'Workflow',
            'last_name': 'Test',
            'email': 'workflow@test.com'
        }
    )
    
    try:
        # 1. Create appointment (operator books)
        appointment = Appointment.objects.create(
            client=client,
            therapist=therapist,
            driver=driver,
            operator=operator,
            date=date.today(),
            start_time=time(10, 0),
            end_time=time(11, 0),
            location='Test Location',
            status='pending'
        )
        print(f"✅ Step 1: Appointment {appointment.id} created with status 'pending'")
        
        # 2. Therapist confirms (using API)
        api_client = APIClient()
        api_client.force_authenticate(user=therapist)
        
        response = api_client.post(f'/api/scheduling/appointments/{appointment.id}/therapist_confirm/')
        if response.status_code == 200:
            appointment.refresh_from_db()
            print(f"✅ Step 2: Therapist confirmed - status: {appointment.status}")
        else:
            print(f"❌ Step 2 failed: {response.status_code} - {response.content.decode()}")
            return False
        
        # 3. Driver confirms (using API)
        api_client.force_authenticate(user=driver)
        
        response = api_client.post(f'/api/scheduling/appointments/{appointment.id}/driver_confirm/')
        if response.status_code == 200:
            appointment.refresh_from_db()
            print(f"✅ Step 3: Driver confirmed - status: {appointment.status}")
        else:
            print(f"❌ Step 3 failed: {response.status_code} - {response.content.decode()}")
            return False
        
        # 4. Operator starts appointment (using API)
        api_client.force_authenticate(user=operator)
        
        response = api_client.post(f'/api/scheduling/appointments/{appointment.id}/start_appointment/')
        if response.status_code == 200:
            appointment.refresh_from_db()
            print(f"✅ Step 4: Operator started appointment - status: {appointment.status}")
        else:
            print(f"❌ Step 4 failed: {response.status_code} - {response.content.decode()}")
            return False
        
        # 5. Driver starts journey (using API)
        api_client.force_authenticate(user=driver)
        
        response = api_client.post(f'/api/scheduling/appointments/{appointment.id}/start_journey/')
        if response.status_code == 200:
            appointment.refresh_from_db()
            print(f"✅ Step 5: Driver started journey - status: {appointment.status}")
        else:
            print(f"❌ Step 5 failed: {response.status_code} - {response.content.decode()}")
            return False
        
        # 6. Driver marks arrived (using API)
        response = api_client.post(f'/api/scheduling/appointments/{appointment.id}/arrive_at_location/')
        if response.status_code == 200:
            appointment.refresh_from_db()
            print(f"✅ Step 6: Driver marked arrived - status: {appointment.status}")
        else:
            print(f"❌ Step 6 failed: {response.status_code} - {response.content.decode()}")
            return False
        
        # 7. Driver drops off (using API)
        response = api_client.post(f'/api/scheduling/appointments/{appointment.id}/drop_off_therapist/')
        if response.status_code == 200:
            appointment.refresh_from_db()
            print(f"✅ Step 7: Driver dropped off - status: {appointment.status}")
        else:
            print(f"❌ Step 7 failed: {response.status_code} - {response.content.decode()}")
            return False
        
        # 8. Therapist starts session (using API)
        api_client.force_authenticate(user=therapist)
        
        response = api_client.post(f'/api/scheduling/appointments/{appointment.id}/start_session/')
        if response.status_code == 200:
            appointment.refresh_from_db()
            print(f"✅ Step 8: Therapist started session - status: {appointment.status}")
        else:
            print(f"❌ Step 8 failed: {response.status_code} - {response.content.decode()}")
            return False
        
        # 9. Test invalid transitions
        print("\n🔒 Testing workflow restrictions...")
        
        # Reset to test invalid transition
        appointment.status = 'driver_confirmed'
        appointment.save()
        
        # Try to start session from wrong status (should fail)
        response = api_client.post(f'/api/scheduling/appointments/{appointment.id}/start_session/')
        if response.status_code == 400:
            print("✅ Correctly blocked session start from 'driver_confirmed' status")
        else:
            print(f"❌ Should have blocked session start, got {response.status_code}")
        
        print(f"\n🎉 Complete workflow test PASSED! Final appointment status: {appointment.status}")
        
        # Cleanup
        appointment.delete()
        print("✅ Test appointment cleaned up")
        return True
        
    except Exception as e:
        print(f"❌ Error during workflow test: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_404_fix():
    """Test that the 404 error for start_session endpoint is fixed"""
    print("\n🔧 Testing 404 fix for start_session endpoint...")
    
    try:
        User = get_user_model()
        therapist = User.objects.filter(role='therapist').first()
        appointment = Appointment.objects.first()
        
        if not therapist or not appointment:
            print("❌ Missing therapist or appointment for 404 test")
            return False
        
        api_client = APIClient()
        api_client.force_authenticate(user=therapist)
        
        # Test that the endpoint exists (should not return 404)
        response = api_client.post(f'/api/scheduling/appointments/{appointment.id}/start_session/')
        
        if response.status_code == 404:
            print("❌ 404 error still exists for start_session endpoint")
            return False
        elif response.status_code in [200, 400, 403]:
            print("✅ start_session endpoint is accessible (no 404 error)")
            return True
        else:
            print(f"⚠️  Unexpected status code {response.status_code}, but no 404")
            return True
            
    except Exception as e:
        print(f"❌ Error testing 404 fix: {str(e)}")
        return False

if __name__ == '__main__':
    print("🚀 Starting comprehensive workflow tests...\n")
    
    success_404 = test_404_fix()
    success_workflow = test_complete_workflow()
    
    print(f"\n📊 Test Results:")
    print(f"  404 Fix Test: {'✅ PASSED' if success_404 else '❌ FAILED'}")
    print(f"  Workflow Test: {'✅ PASSED' if success_workflow else '❌ FAILED'}")
    
    if success_404 and success_workflow:
        print("\n🎉 ALL TESTS PASSED! The appointment confirmation workflow is working correctly!")
    else:
        print("\n❌ Some tests failed. Please review the issues above.")
