#!/usr/bin/env python
"""
Script to create a test user for authentication testing
"""
import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from core.models import CustomUser
from registration.models import Therapist


def create_test_user():
    username = "testtherapist"
    email = "test@example.com"
    password = "testpass123"

    # Check if user already exists
    if CustomUser.objects.filter(username=username).exists():
        print(f"User '{username}' already exists")
        user = CustomUser.objects.get(username=username)
    else:
        # Create user
        user = CustomUser.objects.create_user(
            username=username, email=email, password=password, user_type="therapist"
        )
        print(f"Created user: {username}")

    # Create therapist profile if it doesn't exist
    if not hasattr(user, "therapist"):
        therapist = Therapist.objects.create(
            user=user,
            first_name="Test",
            last_name="Therapist",
            # Add other required fields as needed
        )
        print(f"Created therapist profile for {username}")
    else:
        print(f"Therapist profile already exists for {username}")

    print(f"Test user credentials:")
    print(f"Username: {username}")
    print(f"Password: {password}")
    print(f"Email: {email}")

    return user


if __name__ == "__main__":
    try:
        create_test_user()
    except Exception as e:
        print(f"Error creating test user: {e}")
        import traceback

        traceback.print_exc()
