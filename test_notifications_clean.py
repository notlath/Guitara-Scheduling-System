#!/usr/bin/env python3
"""
Test script to verify notification endpoints work correctly
"""
import os
import sys
import django

# Setup Django
sys.path.append(os.path.join(os.path.dirname(__file__), "guitara"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from django.contrib.auth import authenticate
from rest_framework.authtoken.models import Token
from core.models import CustomUser
from scheduling.models import Notification
import requests


def create_test_user_and_token():
    """Create or get test user and token"""
    try:
        user = CustomUser.objects.get(username="rc_admin")
        print(f"✅ Found existing user: {user.username} ({user.role})")
    except CustomUser.DoesNotExist:
        print("❌ User 'rc_admin' not found")
        return None, None

    # Get or create token
    token, created = Token.objects.get_or_create(user=user)
    print(f"✅ Token for {user.username}: {token.key}")

    return user, token.key


def test_notification_endpoints(token):
    """Test all notification endpoints"""
    base_url = "http://localhost:8000/api/scheduling"
    headers = {"Authorization": f"Token {token}"}

    print("\n=== Testing Notification Endpoints ===")

    # Test fetch notifications
    try:
        response = requests.get(f"{base_url}/notifications/", headers=headers)
        print(f"GET /notifications/ - Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"  Found {len(data)} notifications")
            if data:
                print(f"  Sample: {data[0]['title']}")
        else:
            print(f"  Error: {response.text}")
    except Exception as e:
        print(f"  Error: {e}")

    # Test mark as read (if notifications exist)
    try:
        response = requests.get(f"{base_url}/notifications/", headers=headers)
        if response.status_code == 200:
            notifications = response.json()
            if notifications:
                notif_id = notifications[0]["id"]

                # Test mark as read
                response = requests.post(
                    f"{base_url}/notifications/{notif_id}/mark-read/", headers=headers
                )
                print(
                    f"POST /notifications/{notif_id}/mark-read/ - Status: {response.status_code}"
                )

                # Test mark as unread
                response = requests.post(
                    f"{base_url}/notifications/{notif_id}/mark-unread/", headers=headers
                )
                print(
                    f"POST /notifications/{notif_id}/mark-unread/ - Status: {response.status_code}"
                )

    except Exception as e:
        print(f"  Error testing mark actions: {e}")

    # Test mark all as read
    try:
        response = requests.post(
            f"{base_url}/notifications/mark-all-read/", headers=headers
        )
        print(f"POST /notifications/mark-all-read/ - Status: {response.status_code}")
    except Exception as e:
        print(f"  Error testing mark all: {e}")


def create_sample_notifications(user):
    """Create sample notifications for testing"""
    print(f"\n=== Creating Sample Notifications for {user.username} ===")

    notifications = [
        {
            "title": "New Appointment Scheduled",
            "message": "You have a new appointment scheduled for tomorrow at 2:00 PM",
            "type": "appointment_created",
        },
        {
            "title": "Appointment Updated",
            "message": "Your appointment time has been changed to 3:00 PM",
            "type": "appointment_updated",
        },
        {
            "title": "Appointment Reminder",
            "message": "Reminder: You have an appointment in 1 hour",
            "type": "appointment_reminder",
        },
    ]

    for notif_data in notifications:
        notification, created = Notification.objects.get_or_create(
            user=user,
            title=notif_data["title"],
            defaults={
                "message": notif_data["message"],
                "type": notif_data["type"],
                "is_read": False,
            },
        )
        if created:
            print(f"✅ Created: {notification.title}")
        else:
            print(f"📝 Exists: {notification.title}")


if __name__ == "__main__":
    print("=== Notification System Test ===")

    # Create test user and token
    user, token = create_test_user_and_token()

    if not user or not token:
        print("❌ Cannot proceed without user and token")
        sys.exit(1)

    # Create sample notifications
    create_sample_notifications(user)

    # Test endpoints
    test_notification_endpoints(token)

    print(f"\n=== Test Complete ===")
    print(f"🔑 Use this token in frontend: {token}")
    print(f"👤 User: {user.username} ({user.role})")
    print(f"📧 Email: {user.email}")
