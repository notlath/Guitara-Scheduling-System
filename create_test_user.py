#!/usr/bin/env python3
"""
Create a test superuser for development
"""
import os
import django
import sys

# Setup Django
sys.path.insert(0, "/home/notlath/Downloads/Guitara-Scheduling-System/guitara")
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from core.models import CustomUser

# Create a test superuser
username = "admin"
email = "admin@test.com"
password = "admin123"

try:
    # Check if user exists
    if CustomUser.objects.filter(username=username).exists():
        print(f"❌ User '{username}' already exists")
        user = CustomUser.objects.get(username=username)
        print(f"✅ Found existing user: {user.username} ({user.email})")
    else:
        # Create new superuser
        user = CustomUser.objects.create_superuser(
            username=username, email=email, password=password
        )
        print(f"✅ Created superuser: {user.username} ({user.email})")

    print(f"🔑 You can now login with:")
    print(f"   Username: {username}")
    print(f"   Password: {password}")

except Exception as e:
    print(f"❌ Error creating user: {e}")
    import traceback

    traceback.print_exc()
