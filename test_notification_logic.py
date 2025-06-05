#!/usr/bin/env python
"""
Direct test of notification logic to identify the 500 error cause
"""
import os
import sys
import django

# Setup Django
project_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'guitara')
sys.path.append(project_dir)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

from core.models import CustomUser
from scheduling.models import Notification
from scheduling.serializers import NotificationSerializer
from scheduling.views import NotificationViewSet
from rest_framework.test import APIRequestFactory
from django.contrib.auth.models import AnonymousUser
from rest_framework import status

def test_notification_creation():
    """Test creating notifications"""
    print("=== Testing Notification Creation ===")
    
    try:
        # Try to get or create a user
        user = CustomUser.objects.first()
        if not user:
            print("No users found, creating test user...")
            user = CustomUser.objects.create_user(
                username="testuser",
                first_name="Test",
                last_name="User",
                role="operator"
            )
        
        print(f"Using user: {user}")
        
        # Try to create a notification
        notification = Notification.objects.create(
            user=user,
            notification_type="appointment_created",
            message="Test notification"
        )
        print(f"✓ Created notification: {notification}")
        
        # Test serialization
        serializer = NotificationSerializer(notification)
        data = serializer.data
        print(f"✓ Serialization successful: {data}")
        
    except Exception as e:
        print(f"✗ Error in notification creation: {e}")
        import traceback
        traceback.print_exc()

def test_notification_viewset_direct():
    """Test the NotificationViewSet directly"""
    print("\n=== Testing NotificationViewSet Direct ===")
    
    try:
        # Create request factory
        factory = APIRequestFactory()
        
        # Get a user
        user = CustomUser.objects.first()
        if not user:
            print("No user available for testing")
            return
            
        print(f"Testing with user: {user}")
        
        # Create a GET request
        request = factory.get('/api/scheduling/notifications/')
        request.user = user
        
        # Create viewset instance
        viewset = NotificationViewSet()
        viewset.request = request
        viewset.format_kwarg = None
        
        print("✓ ViewSet created successfully")
        
        # Test get_queryset
        queryset = viewset.get_queryset()
        print(f"✓ get_queryset returned {queryset.count()} notifications")
        
        # Test list method
        response = viewset.list(request)
        print(f"✓ list method returned status {response.status_code}")
        
        if hasattr(response, 'data'):
            print(f"✓ Response data: {response.data}")
        
    except Exception as e:
        print(f"✗ Error in viewset test: {e}")
        import traceback
        traceback.print_exc()

def test_anonymous_access():
    """Test with anonymous user (which might be the issue)"""
    print("\n=== Testing Anonymous Access ===")
    
    try:
        factory = APIRequestFactory()
        request = factory.get('/api/scheduling/notifications/')
        request.user = AnonymousUser()
        
        viewset = NotificationViewSet()
        viewset.request = request
        viewset.format_kwarg = None
        
        print("Testing with anonymous user...")
        
        # This should fail with permission denied, not 500 error
        response = viewset.list(request)
        print(f"Anonymous access status: {response.status_code}")
        
    except Exception as e:
        print(f"Anonymous access error: {e}")
        import traceback
        traceback.print_exc()

def check_database_integrity():
    """Check for database integrity issues"""
    print("\n=== Checking Database Integrity ===")
    
    try:
        # Check if we can access notifications table
        count = Notification.objects.count()
        print(f"✓ Notifications table accessible, {count} records")
        
        # Check users table
        user_count = CustomUser.objects.count()
        print(f"✓ Users table accessible, {user_count} records")
        
        # Check for any notifications with missing user references
        notifications_with_invalid_users = Notification.objects.filter(user__isnull=True)
        print(f"Notifications with null users: {notifications_with_invalid_users.count()}")
        
        # Check for any notifications with missing appointment references
        notifications = Notification.objects.all()[:5]
        for notif in notifications:
            print(f"Notification {notif.id}: user={notif.user}, appointment={notif.appointment}")
            
    except Exception as e:
        print(f"Database integrity check failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    print("Starting direct notification logic test...")
    
    check_database_integrity()
    test_notification_creation()
    test_notification_viewset_direct()
    test_anonymous_access()
    
    print("\nTest completed!")
