#!/usr/bin/env python
"""
Simple test to verify API endpoints and workflow validation
"""
import os
import sys
import django
import requests
import json

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

from django.contrib.auth import get_user_model
from scheduling.models import Appointment, Client
from django.test.client import Client as TestClient
from django.urls import reverse
from rest_framework.test import APIClient

def test_start_session_endpoint():
    """Test that start_session endpoint enforces correct workflow"""
    print("🧪 Testing start_session endpoint workflow validation...")
    
    try:
        # Create API client
        client = APIClient()
        
        # Get test users
        User = get_user_model()
        therapist = User.objects.filter(role='therapist').first()
        
        if not therapist:
            print("❌ No therapist found for testing")
            return
            
        # Login as therapist
        client.force_authenticate(user=therapist)
        
        # Get an appointment to test with
        appointment = Appointment.objects.filter(therapist=therapist).first()
        
        if not appointment:
            print("❌ No appointment found for testing")
            return
            
        print(f"✅ Testing with appointment {appointment.id} (status: {appointment.status})")
        
        # Test start_session endpoint
        url = f"/api/scheduling/appointments/{appointment.id}/start_session/"
        
        # Save original status
        original_status = appointment.status
        
        # Test with wrong status (should fail)
        appointment.status = 'driver_confirmed'
        appointment.save()
        
        response = client.post(url)
        print(f"📊 POST {url} with status 'driver_confirmed': {response.status_code}")
        
        if response.status_code == 400:
            print("✅ Correctly blocked session start from 'driver_confirmed' status")
            response_data = response.json()
            print(f"   Error message: {response_data.get('error', 'N/A')}")
        else:
            print(f"❌ Expected 400, got {response.status_code}")
            
        # Test with correct status (should work)
        appointment.status = 'dropped_off'
        appointment.save()
        
        response = client.post(url)
        print(f"📊 POST {url} with status 'dropped_off': {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Successfully allowed session start from 'dropped_off' status")
            response_data = response.json()
            print(f"   Success message: {response_data.get('message', 'N/A')}")
        else:
            print(f"❌ Expected 200, got {response.status_code}")
            if response.content:
                print(f"   Response: {response.content.decode()}")
        
        # Restore original status
        appointment.status = original_status
        appointment.save()
        
        print("✅ start_session endpoint test completed")
        
    except Exception as e:
        print(f"❌ Error testing start_session endpoint: {str(e)}")
        import traceback
        traceback.print_exc()

def test_start_appointment_endpoint():
    """Test that start_appointment endpoint works for operators"""
    print("\n🧪 Testing start_appointment endpoint for operators...")
    
    try:
        # Create API client
        client = APIClient()
        
        # Get test users
        User = get_user_model()
        operator = User.objects.filter(role='operator').first()
        
        if not operator:
            print("❌ No operator found for testing")
            return
            
        # Login as operator
        client.force_authenticate(user=operator)
        
        # Get an appointment to test with
        appointment = Appointment.objects.first()
        
        if not appointment:
            print("❌ No appointment found for testing")
            return
            
        print(f"✅ Testing with appointment {appointment.id} (status: {appointment.status})")
        
        # Save original status
        original_status = appointment.status
        
        # Set to driver_confirmed status
        appointment.status = 'driver_confirmed'
        appointment.save()
        
        # Test start_appointment endpoint
        url = f"/api/scheduling/appointments/{appointment.id}/start_appointment/"
        response = client.post(url)
        
        print(f"📊 POST {url} with status 'driver_confirmed': {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Successfully started appointment from 'driver_confirmed' status")
            response_data = response.json()
            print(f"   Success message: {response_data.get('message', 'N/A')}")
            
            # Check that status changed to in_progress
            appointment.refresh_from_db()
            if appointment.status == 'in_progress':
                print("✅ Status correctly changed to 'in_progress'")
            else:
                print(f"❌ Expected status 'in_progress', got '{appointment.status}'")
        else:
            print(f"❌ Expected 200, got {response.status_code}")
            if response.content:
                print(f"   Response: {response.content.decode()}")
        
        # Restore original status
        appointment.status = original_status
        appointment.save()
        
        print("✅ start_appointment endpoint test completed")
        
    except Exception as e:
        print(f"❌ Error testing start_appointment endpoint: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    test_start_session_endpoint()
    test_start_appointment_endpoint()
    print("\n🎯 API endpoint tests completed!")
