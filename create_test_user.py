#!/usr/bin/env python3
"""
Create a test therapist user for testing
"""
import os
import sys
import django

# Setup Django environment
sys.path.append('/home/notlath/Downloads/Guitara-Scheduling-System/guitara')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

from core.models import CustomUser

def create_test_user():
    try:
        # Create a test therapist user
        user = CustomUser.objects.create_user(
            username='testtherapist',
            email='test@example.com',
            password='password123',
            role='therapist',
            phone_number='1234567890'
        )
        print(f"✓ Test user created: {user.username} (Role: {user.role})")
        return user
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            print("✓ Test user already exists")
            user = CustomUser.objects.get(username='testtherapist')
            return user
        else:
            print(f"✗ Error creating user: {e}")
            return None

if __name__ == "__main__":
    user = create_test_user()
    if user:
        print(f"Username: {user.username}")
        print(f"Role: {user.role}")
        print(f"Email: {user.email}")
