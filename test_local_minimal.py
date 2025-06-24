#!/usr/bin/env python3
"""
Simple local test for minimal mode configuration
"""

import os
from pathlib import Path

# Set up environment
guitara_dir = Path(__file__).parent / "guitara"
os.chdir(guitara_dir)
os.environ["DJANGO_SETTINGS_MODULE"] = "guitara.settings_railway_minimal"

print("🧪 Local Minimal Mode Test")
print("=" * 40)

# Check if required packages are available
try:
    import django
    import psycopg2
    import rest_framework
    import corsheaders
    import knox

    print("✅ All required packages are available")
except ImportError as e:
    print(f"❌ Missing package: {e}")
    exit(1)

# Test Django setup
try:
    django.setup()
    print("✅ Django setup successful")
except Exception as e:
    print(f"❌ Django setup failed: {e}")
    exit(1)

# Test settings import
try:
    from django.conf import settings

    print(f"✅ Settings loaded: {settings.SETTINGS_MODULE}")
    print(f"   Installed apps: {len(settings.INSTALLED_APPS)}")
    print(f"   Middleware: {len(settings.MIDDLEWARE)}")
except Exception as e:
    print(f"❌ Settings import failed: {e}")
    exit(1)

# Test URL configuration
try:
    from django.urls import resolve

    resolve("/health/")
    resolve("/health/minimal/")
    resolve("/ready/")
    print("✅ URL configuration is valid")
except Exception as e:
    print(f"❌ URL configuration error: {e}")
    exit(1)

print("\n🎉 Local minimal mode configuration is valid!")
print("🚀 Ready for Railway deployment!")
