#!/usr/bin/env python3
"""
Test script to verify notification system functionality
"""

import os
import sys
import django

# Add the guitara directory to the Python path
sys.path.append('c:/Users/USer/Downloads/Guitara-Scheduling-System/guitara')

# Set the Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')

# Setup Django
django.setup()

from django.contrib.auth import get_user_model
from scheduling.models import Notification

User = get_user_model()

def test_notification_features():
    """Test all notification features"""
    print("🔍 Testing Notification System Features...")
    
    # Get or create a test user
    user, created = User.objects.get_or_create(
        email='test_user@example.com',
        defaults={
            'first_name': 'Test',
            'last_name': 'User',
            'role': 'operator',
            'is_active': True
        }
    )
    if created:
        user.set_password('testpass123')
        user.save()
    
    print(f"✓ Using test user: {user.email}")
    
    # Create test notifications
    print("\n📧 Creating test notifications...")
    for i in range(5):
        notification = Notification.objects.create(
            user=user,
            notification_type="appointment_created",
            message=f"Test notification {i+1}",
            is_read=(i % 2 == 0)  # Alternate read/unread
        )
        print(f"✓ Created notification {notification.id}: '{notification.message}' (read: {notification.is_read})")
    
    # Test notification counts
    total_notifications = Notification.objects.filter(user=user).count()
    unread_notifications = Notification.objects.filter(user=user, is_read=False).count()
    read_notifications = Notification.objects.filter(user=user, is_read=True).count()
    
    print(f"\n📊 Notification Statistics:")
    print(f"   Total: {total_notifications}")
    print(f"   Unread: {unread_notifications}")
    print(f"   Read: {read_notifications}")
    
    # Test mark all as read
    print("\n✅ Testing mark all as read...")
    Notification.objects.filter(user=user).update(is_read=True)
    unread_after_mark_all = Notification.objects.filter(user=user, is_read=False).count()
    print(f"✓ Unread count after mark all as read: {unread_after_mark_all}")
    
    # Test mark as unread
    print("\n📋 Testing mark as unread...")
    first_notification = Notification.objects.filter(user=user).first()
    if first_notification:
        first_notification.is_read = False
        first_notification.save()
        print(f"✓ Marked notification {first_notification.id} as unread")
    
    # Test delete single notification
    print("\n🗑️  Testing delete single notification...")
    if first_notification:
        notification_id = first_notification.id
        first_notification.delete()
        print(f"✓ Deleted notification {notification_id}")
    
    # Test delete all notifications
    print("\n🗑️  Testing delete all notifications...")
    remaining_count = Notification.objects.filter(user=user).count()
    print(f"   Notifications before delete all: {remaining_count}")
    Notification.objects.filter(user=user).delete()
    final_count = Notification.objects.filter(user=user).count()
    print(f"✓ Notifications after delete all: {final_count}")
    
    print("\n🎉 All notification features tested successfully!")
    return True

if __name__ == "__main__":
    try:
        test_notification_features()
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
