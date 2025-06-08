#!/usr/bin/env python3
"""
Simple health check script to verify backend is running and accessible
"""
import requests
import json
import sys
import os

# Add the guitara directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), "guitara"))


def check_backend_health():
    """Check if Django backend is running and accessible"""
    base_url = "http://localhost:8000"

    print("=== Backend Health Check ===")

    # Check if server is running
    try:
        response = requests.get(f"{base_url}/api/", timeout=5)
        print(f"✅ Backend server is running (Status: {response.status_code})")
    except requests.exceptions.ConnectionError:
        print("❌ Backend server is not running or not accessible")
        return False
    except Exception as e:
        print(f"❌ Error checking backend: {e}")
        return False

    # Check auth endpoints
    try:
        response = requests.post(f"{base_url}/api/auth/login/", timeout=5)
        print(f"✅ Auth login endpoint accessible (Status: {response.status_code})")
    except Exception as e:
        print(f"⚠️ Auth endpoint check failed: {e}")

    # Check scheduling endpoints
    try:
        response = requests.get(f"{base_url}/api/scheduling/", timeout=5)
        print(f"✅ Scheduling endpoint accessible (Status: {response.status_code})")
    except Exception as e:
        print(f"⚠️ Scheduling endpoint check failed: {e}")

    return True


def test_notification_endpoint():
    """Test notification endpoint with various authentication scenarios"""
    base_url = "http://localhost:8000"

    print("\n=== Notification Endpoint Test ===")

    # Test without authentication
    try:
        response = requests.get(f"{base_url}/api/scheduling/notifications/", timeout=5)
        print(f"No auth: Status {response.status_code}")
        if response.status_code == 401:
            print("✅ Correctly requires authentication")
        else:
            print("⚠️ Endpoint accessible without auth")
    except Exception as e:
        print(f"❌ Error testing notifications endpoint: {e}")

    # Test with invalid token
    try:
        headers = {"Authorization": "Token invalid_token"}
        response = requests.get(
            f"{base_url}/api/scheduling/notifications/", headers=headers, timeout=5
        )
        print(f"Invalid token: Status {response.status_code}")
        if response.status_code == 401:
            print("✅ Correctly rejects invalid token")
        else:
            print("⚠️ Invalid token accepted or other error")
    except Exception as e:
        print(f"❌ Error testing invalid token: {e}")


def check_database():
    """Check if we can access the database and see notifications"""
    try:
        import django

        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
        django.setup()

        from scheduling.models import Notification
        from core.models import CustomUser

        print("\n=== Database Check ===")

        # Count notifications by role
        for role in ["operator", "therapist", "driver"]:
            users = CustomUser.objects.filter(role=role, is_active=True)
            notifications = Notification.objects.filter(user__role=role)
            print(
                f"📊 {role.title()}s: {users.count()} users, {notifications.count()} notifications"
            )

            # Show sample notifications
            if notifications.exists():
                latest = notifications.order_by("-created_at").first()
                print(f"   Latest: '{latest.title}' for {latest.user.username}")

        return True

    except Exception as e:
        print(f"❌ Database check failed: {e}")
        return False


if __name__ == "__main__":
    # Change to the correct directory
    script_dir = os.path.dirname(os.path.abspath(__file__))
    guitara_dir = os.path.join(script_dir, "guitara")

    if os.path.exists(guitara_dir):
        os.chdir(guitara_dir)
        print(f"📁 Working directory: {os.getcwd()}")

    # Run health checks
    backend_ok = check_backend_health()
    test_notification_endpoint()

    if backend_ok:
        check_database()
    else:
        print("\n⚠️ Backend not running. Start with: python manage.py runserver")

    print("\n=== Health Check Complete ===")
