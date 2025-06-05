#!/usr/bin/env python
"""
Simple test to check the notifications endpoint issue
"""
import os
import django
import sys

# Add the project directory to the Python path
project_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "guitara")
sys.path.append(project_dir)

# Set the Django settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")

# Setup Django
django.setup()

print("Django setup complete")

try:
    from scheduling.models import Notification

    print("✓ Successfully imported Notification model")

    count = Notification.objects.count()
    print(f"✓ Found {count} notifications in database")

    # Try to get a few notifications
    notifications = list(Notification.objects.all()[:3])
    print(f"✓ Retrieved {len(notifications)} notifications")

    for notification in notifications:
        print(
            f"  - ID: {notification.id}, Type: {notification.notification_type}, User: {notification.user}"
        )

except Exception as e:
    print(f"✗ Error with Notification model: {e}")
    import traceback

    traceback.print_exc()

try:
    from scheduling.serializers import NotificationSerializer

    print("✓ Successfully imported NotificationSerializer")

    # Test serialization of a few notifications
    notifications = Notification.objects.all()[:2]
    for notification in notifications:
        try:
            serializer = NotificationSerializer(notification)
            data = serializer.data
            print(f"✓ Serialized notification {notification.id} successfully")
            print(f"  Data keys: {list(data.keys())}")
        except Exception as e:
            print(f"✗ Error serializing notification {notification.id}: {e}")
            import traceback

            traceback.print_exc()

except Exception as e:
    print(f"✗ Error with NotificationSerializer: {e}")
    import traceback

    traceback.print_exc()

try:
    from scheduling.views import NotificationViewSet

    print("✓ Successfully imported NotificationViewSet")

    # Try to create the viewset
    viewset = NotificationViewSet()
    print("✓ NotificationViewSet created successfully")

    # Try get_queryset method
    queryset = viewset.get_queryset()
    print(f"✓ get_queryset returned {queryset.count()} notifications")

except Exception as e:
    print(f"✗ Error with NotificationViewSet: {e}")
    import traceback

    traceback.print_exc()

print("\nTest completed!")
