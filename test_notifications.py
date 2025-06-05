#!/usr/bin/env python3
"""
Test script to verify the notifications endpoint
"""

import os
import sys
import django
import json

# Add the project directory to the Python path
project_dir = os.path.join(os.path.dirname(__file__), 'guitara')
sys.path.insert(0, project_dir)

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

from django.test import Client
from django.contrib.auth import get_user_model
from scheduling.models import Notification

User = get_user_model()

def test_notifications_endpoint():
    """Test the notifications endpoint"""
    print("🧪 Testing notifications endpoint...")
    
    # Create test user (operator)
    try:
        operator = User.objects.create_user(
            username='test_operator_notif',
            password='testpass123',
            email='operator_notif@test.com',
            role='operator',
            first_name='Test',
            last_name='Operator'
        )
        print(f"✅ Created test operator: {operator.username}")
    except Exception as e:
        print(f"❌ Error creating operator: {e}")
        return False
    
    # Create test notification
    try:
        notification = Notification.objects.create(
            user=operator,
            notification_type='appointment_created',
            message='Test notification message',
            is_read=False
        )
        print(f"✅ Created test notification: {notification.id}")
    except Exception as e:
        print(f"❌ Error creating notification: {e}")
        return False
    
    # Test the API endpoint
    client = Client()
    
    # Login as operator
    login_success = client.login(username='test_operator_notif', password='testpass123')
    if not login_success:
        print("❌ Failed to login as operator")
        return False
    
    print(f"✅ Logged in as operator")
    
    # Test GET notifications
    try:
        response = client.get('/api/scheduling/notifications/')
        print(f"🔍 GET /api/scheduling/notifications/ - Status: {response.status_code}")
        
        if response.status_code == 200:
            data = json.loads(response.content.decode())
            print(f"✅ Notifications endpoint works! Found {len(data)} notifications")
            print(f"🔍 First notification: {data[0] if data else 'None'}")
        else:
            print(f"❌ Notifications endpoint failed with status {response.status_code}")
            print(f"Response: {response.content.decode()}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing notifications endpoint: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Cleanup
    try:
        notification.delete()
        operator.delete()
        print("✅ Cleanup completed")
    except Exception as e:
        print(f"❌ Cleanup error: {e}")
    
    return True

if __name__ == '__main__':
    try:
        success = test_notifications_endpoint()
        if success:
            print("\n🎉 Notifications endpoint test completed successfully!")
        else:
            print("\n❌ Notifications endpoint test failed!")
    except Exception as e:
        print(f"\n❌ Test script error: {e}")
        import traceback
        traceback.print_exc()
