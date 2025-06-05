#!/usr/bin/env python3
"""
Simple Django debug script to test notifications
"""

import os
import sys

# Add the project directory to the Python path
project_dir = os.path.join(os.path.dirname(__file__), 'guitara')
sys.path.insert(0, project_dir)

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')

import django
django.setup()

def debug_notifications():
    """Debug notifications model and serializer"""
    print("🔍 Starting notifications debug...")
    
    try:
        from scheduling.models import Notification
        print("✅ Successfully imported Notification model")
        
        # Check if table exists
        count = Notification.objects.count()
        print(f"✅ Notifications table exists, count: {count}")
        
    except Exception as e:
        print(f"❌ Error with Notification model: {e}")
        import traceback
        traceback.print_exc()
        return
    
    try:
        from scheduling.serializers import NotificationSerializer
        print("✅ Successfully imported NotificationSerializer")
        
        # Test serializer with empty queryset
        notifications = Notification.objects.none()
        serializer = NotificationSerializer(notifications, many=True)
        data = serializer.data
        print(f"✅ Serializer works with empty queryset: {len(data)} items")
        
    except Exception as e:
        print(f"❌ Error with NotificationSerializer: {e}")
        import traceback
        traceback.print_exc()
        return
    
    try:
        from core.models import CustomUser
        
        # Test with actual data if available
        user = CustomUser.objects.filter(role='operator').first()
        if user:
            print(f"✅ Found operator user: {user.username}")
            
            notifications = Notification.objects.filter(user=user)[:5]
            print(f"✅ Found {notifications.count()} notifications for user")
            
            if notifications.exists():
                serializer = NotificationSerializer(notifications, many=True)
                data = serializer.data
                print(f"✅ Serialized {len(data)} notifications successfully")
                print(f"🔍 First notification keys: {list(data[0].keys()) if data else 'None'}")
            else:
                print("ℹ️ No notifications found for testing")
        else:
            print("ℹ️ No operator users found for testing")
            
    except Exception as e:
        print(f"❌ Error testing with real data: {e}")
        import traceback
        traceback.print_exc()
        return
    
    print("🎉 Notifications debug completed!")

if __name__ == '__main__':
    debug_notifications()
