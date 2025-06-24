#!/usr/bin/env python3
"""
Simple test script to verify health endpoints without Django setup
"""
import sys
import os
from pathlib import Path

# Add the guitara directory to the path
guitara_dir = Path(__file__).parent / "guitara"
sys.path.insert(0, str(guitara_dir))
os.chdir(guitara_dir)

# Minimal environment setup
os.environ["DJANGO_SETTINGS_MODULE"] = "guitara.emergency_settings"

# Create emergency settings file
emergency_settings_content = '''
"""Emergency settings for health check testing"""
import os

DEBUG = False
SECRET_KEY = "test-key-for-health-check"
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',
]

MIDDLEWARE = []

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

ROOT_URLCONF = 'guitara.urls'
'''

with open(guitara_dir / "guitara" / "emergency_settings.py", "w") as f:
    f.write(emergency_settings_content)

print("✅ Emergency settings created")

# Now test Django setup
try:
    import django

    django.setup()
    print("✅ Django setup successful")

    from django.test import Client

    client = Client()

    # Test health endpoints
    endpoints = ["/health/", "/healthcheck/", "/ping/"]

    for endpoint in endpoints:
        try:
            response = client.get(endpoint)
            print(f"✅ {endpoint}: {response.status_code}")
            if response.status_code == 200:
                print(f"   Response: {response.content.decode()[:200]}")
        except Exception as e:
            print(f"❌ {endpoint}: {e}")

except Exception as e:
    print(f"❌ Django setup failed: {e}")
    import traceback

    traceback.print_exc()
