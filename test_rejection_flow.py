#!/usr/bin/env python3
"""
Test script to verify the appointment rejection flow
This script tests the backend rejection endpoint to ensure it properly validates rejection reasons
"""

import os
import sys
import django
import json
from django.conf import settings

# Add the project directory to the Python path
project_dir = os.path.join(os.path.dirname(__file__), 'guitara')
sys.path.insert(0, project_dir)

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from scheduling.models import Appointment, Client as ClientModel
from registration.models import Service
from datetime import datetime, time
from django.utils import timezone

User = get_user_model()

def create_test_data():
    """Create test data for the rejection flow"""
    print("🔧 Creating test data...")
    
    # Create therapist user
    therapist = User.objects.create_user(
        username='test_therapist',
        password='testpass123',
        email='therapist@test.com',
        role='therapist',
        first_name='Test',
        last_name='Therapist'
    )
    
    # Create operator user
    operator = User.objects.create_user(
        username='test_operator',
        password='testpass123',
        email='operator@test.com',
        role='operator',
        first_name='Test',
        last_name='Operator'
    )
    
    # Create client
    client = ClientModel.objects.create(
        first_name='Test',
        last_name='Client',
        email='client@test.com',
        phone='1234567890'
    )
    
    # Get or create service
    service, created = Service.objects.get_or_create(
        name='Test Massage',
        defaults={
            'description': 'Test massage service',
            'duration': 60,
            'price': 100.00
        }
    )
    
    # Create appointment
    appointment = Appointment.objects.create(
        client=client,
        therapist=therapist,
        operator=operator,
        service=service,
        date=timezone.now().date(),
        time=time(14, 0),  # 2:00 PM
        status='pending',
        duration=60,
        total_price=100.00
    )
    
    print(f"✅ Created appointment {appointment.id} with therapist {therapist.username}")
    return therapist, operator, appointment

def test_rejection_flow():
    """Test the rejection endpoint"""
    print("\n🧪 Testing appointment rejection flow...")
    
    therapist, operator, appointment = create_test_data()
    
    # Create Django test client
    client = Client()
    
    # Login as therapist
    login_success = client.login(username='test_therapist', password='testpass123')
    if not login_success:
        print("❌ Failed to login as therapist")
        return False
    
    print(f"✅ Logged in as therapist")
    
    # Test cases
    test_cases = [
        {
            'name': 'Empty rejection reason',
            'data': {},
            'expected_status': 400,
            'expected_error': 'Rejection reason is required'
        },
        {
            'name': 'None rejection reason',
            'data': {'rejection_reason': None},
            'expected_status': 400,
            'expected_error': 'Rejection reason is required'
        },
        {
            'name': 'Empty string rejection reason',
            'data': {'rejection_reason': ''},
            'expected_status': 400,
            'expected_error': 'Rejection reason is required'
        },
        {
            'name': 'Whitespace only rejection reason',
            'data': {'rejection_reason': '   '},
            'expected_status': 400,
            'expected_error': 'Rejection reason is required'
        },
        {
            'name': 'Valid rejection reason',
            'data': {'rejection_reason': 'Schedule conflict'},
            'expected_status': 200,
            'expected_error': None
        }
    ]
    
    for test_case in test_cases:
        print(f"\n🔍 Testing: {test_case['name']}")
        
        # Reset appointment status for each test
        appointment.status = 'pending'
        appointment.rejection_reason = None
        appointment.rejected_by = None
        appointment.rejected_at = None
        appointment.save()
        
        # Make the request
        response = client.post(
            f'/api/appointments/{appointment.id}/reject/',
            data=json.dumps(test_case['data']),
            content_type='application/json'
        )
        
        print(f"   Status Code: {response.status_code} (expected: {test_case['expected_status']})")
        
        if response.status_code != test_case['expected_status']:
            print(f"   ❌ Status code mismatch!")
            print(f"   Response: {response.content.decode()}")
            continue
        
        if test_case['expected_error']:
            response_data = json.loads(response.content.decode())
            if 'error' in response_data and test_case['expected_error'] in response_data['error']:
                print(f"   ✅ Expected error message found: {response_data['error']}")
            else:
                print(f"   ❌ Expected error message not found. Response: {response_data}")
        else:
            print(f"   ✅ Success response received")
            
            # Refresh appointment from database
            appointment.refresh_from_db()
            if appointment.status == 'rejected':
                print(f"   ✅ Appointment status updated to 'rejected'")
                print(f"   ✅ Rejection reason: '{appointment.rejection_reason}'")
            else:
                print(f"   ❌ Appointment status not updated. Current status: {appointment.status}")
    
    print("\n🎉 Rejection flow testing completed!")
    return True

def cleanup_test_data():
    """Clean up test data"""
    print("\n🧹 Cleaning up test data...")
    User.objects.filter(username__startswith='test_').delete()
    ClientModel.objects.filter(email__endswith='@test.com').delete()
    print("✅ Cleanup completed")

if __name__ == '__main__':
    try:
        test_rejection_flow()
    finally:
        cleanup_test_data()
