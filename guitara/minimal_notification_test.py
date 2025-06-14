"""
Minimal notification test to identify the 500 error cause.
Run this script with: python manage.py shell < minimal_notification_test.py
"""

print("=== Minimal Notification Test ===")

try:
    # Import required models
    from django.contrib.auth import get_user_model
    from scheduling.models import Notification
    from scheduling.serializers import NotificationSerializer
    from rest_framework import serializers

    User = get_user_model()
    print("✓ Imports successful")

    # Check basic counts
    user_count = User.objects.count()
    notification_count = Notification.objects.count()
    print(f"✓ Users: {user_count}, Notifications: {notification_count}")

    if user_count == 0:
        print("Creating test user...")
        test_user = User.objects.create_user(
            username="test_notification_user",
            email="test@example.com",
            role="operator",
            is_active=True,
        )
        print(f"✓ Created test user: {test_user.username}")
    else:
        test_user = User.objects.first()
        print(f"✓ Using existing user: {test_user.username}")

    # Get notifications for this user
    user_notifications = Notification.objects.filter(user=test_user)
    user_notification_count = user_notifications.count()
    print(f"✓ User notifications: {user_notification_count}")

    if user_notification_count == 0:
        print("Creating test notification...")
        test_notification = Notification.objects.create(
            user=test_user,
            notification_type="appointment_created",
            message="Test notification for debugging",
            is_read=False,
        )
        print(f"✓ Created test notification: {test_notification.id}")
        user_notifications = Notification.objects.filter(user=test_user)

    # Test serialization of first notification
    first_notification = user_notifications.first()
    if first_notification:
        print(f"Testing notification {first_notification.id}...")

        # Check all fields individually
        print(f"  - ID: {first_notification.id}")
        print(f"  - User: {first_notification.user}")
        print(f"  - User ID: {first_notification.user.id}")
        print(f"  - Type: {first_notification.notification_type}")
        print(f"  - Message: {first_notification.message[:50]}...")
        print(f"  - Is Read: {first_notification.is_read}")
        print(f"  - Created: {first_notification.created_at}")

        # Check optional foreign keys
        print(f"  - Appointment: {first_notification.appointment}")
        if first_notification.appointment:
            try:
                print(f"    Appointment ID: {first_notification.appointment.id}")
                print(
                    f"    Appointment Status: {first_notification.appointment.status}"
                )
            except Exception as e:
                print(f"    ✗ Appointment access error: {e}")

        print(f"  - Rejection: {first_notification.rejection}")
        if first_notification.rejection:
            try:
                print(f"    Rejection ID: {first_notification.rejection.id}")
            except Exception as e:
                print(f"    ✗ Rejection access error: {e}")

        # Test serializer
        print("Testing NotificationSerializer...")
        try:
            serializer = NotificationSerializer(first_notification)
            data = serializer.data
            print(f"✓ Serialization successful")
            print(f"  Serialized keys: {list(data.keys())}")

            # Test custom to_representation method
            print("Testing custom to_representation...")
            representation = serializer.to_representation(first_notification)
            print(f"✓ Custom representation successful")
            print(f"  Representation keys: {list(representation.keys())}")

        except Exception as e:
            print(f"✗ Serialization failed: {e}")
            import traceback

            traceback.print_exc()

    # Test bulk serialization
    print("Testing bulk serialization...")
    try:
        serializer = NotificationSerializer(user_notifications, many=True)
        bulk_data = serializer.data
        print(f"✓ Bulk serialization successful: {len(bulk_data)} items")
    except Exception as e:
        print(f"✗ Bulk serialization failed: {e}")
        import traceback

        traceback.print_exc()

    print("✓ All tests completed successfully")

except Exception as e:
    print(f"✗ Critical error: {e}")
    import traceback

    traceback.print_exc()

print("=== Test Complete ===")
