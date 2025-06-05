#!/usr/bin/env python
"""
Test script to directly test the notifications endpoint
"""
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'guitara'))

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')

# Setup Django
django.setup()

from scheduling.models import Notification, Appointment
from core.models import CustomUser
from scheduling.serializers import NotificationSerializer
from scheduling.views import NotificationViewSet
from django.test import RequestFactory
from django.contrib.auth.models import AnonymousUser
import traceback

def test_notification_serializer():
    """Test the NotificationSerializer directly"""
    print("=== Testing NotificationSerializer ===")
    
    try:
        # Get some notifications
        notifications = Notification.objects.all()[:5]
        print(f"Found {notifications.count()} notifications")
        
        for notification in notifications:
            print(f"\nTesting notification {notification.id}:")
            print(f"  Type: {notification.notification_type}")
            print(f"  User: {notification.user}")
            print(f"  Message: {notification.message}")
            print(f"  Created: {notification.created_at}")
            
            try:
                serializer = NotificationSerializer(notification)
                data = serializer.data
                print(f"  Serialization successful: {data}")
            except Exception as e:
                print(f"  Serialization failed: {e}")
                traceback.print_exc()
                
    except Exception as e:
        print(f"Error in test_notification_serializer: {e}")
        traceback.print_exc()

def test_notification_viewset():
    """Test the NotificationViewSet directly"""
    print("\n=== Testing NotificationViewSet ===")
    
    try:
        # Create a mock request
        factory = RequestFactory()
        request = factory.get('/api/scheduling/notifications/')
        request.user = AnonymousUser()
        
        # Try to create viewset instance
        viewset = NotificationViewSet()
        viewset.request = request
        viewset.format_kwarg = None
        
        print("ViewSet created successfully")
        
        # Test get_queryset
        try:
            queryset = viewset.get_queryset()
            print(f"get_queryset successful: {queryset.count()} notifications")
        except Exception as e:
            print(f"get_queryset failed: {e}")
            traceback.print_exc()
        
        # Test list method
        try:
            response = viewset.list(request)
            print(f"list method successful: {response.status_code}")
            print(f"Response data: {response.data}")
        except Exception as e:
            print(f"list method failed: {e}")
            traceback.print_exc()
            
    except Exception as e:
        print(f"Error in test_notification_viewset: {e}")
        traceback.print_exc()

def test_models():
    """Test basic model access"""
    print("\n=== Testing Models ===")
    
    try:
        # Test Notification model
        notification_count = Notification.objects.count()
        print(f"Total notifications: {notification_count}")
        
        # Test CustomUser model
        user_count = CustomUser.objects.count()
        print(f"Total users: {user_count}")
        
        # Check for any notifications with problematic relationships
        notifications = Notification.objects.all()
        for notification in notifications[:5]:
            print(f"Notification {notification.id}:")
            print(f"  User exists: {notification.user is not None}")
            print(f"  User ID: {notification.user.id if notification.user else 'None'}")
            
    except Exception as e:
        print(f"Error in test_models: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    print("Starting comprehensive notifications endpoint test...")
    
    test_models()
    test_notification_serializer()
    test_notification_viewset()
    
    print("\nTest completed!")
