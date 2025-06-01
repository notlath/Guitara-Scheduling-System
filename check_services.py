"""
This script checks for services in the database and verifies they exist properly.
It helps diagnose issues with service relationships in appointments.
"""

import os
import sys
import django
from datetime import timedelta

# Set up Django environment
sys.path.append('.')  # Add current directory to path
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
try:
    django.setup()
except Exception as e:
    print(f"Error setting up Django: {e}")
    print("Trying alternative approach...")
    sys.path.append('guitara')
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
    django.setup()

try:
    # Import the Service model from registration app
    from guitara.registration.models import Service
    print("✓ Successfully imported Service model")
    
    # Try querying services
    try:
        services = Service.objects.all()
        print(f"✓ Found {services.count()} services in database.")
        
        # List all services
        for service in services:
            print(f"  - ID: {service.id}, Name: {service.name}, Duration: {service.duration}, Price: {service.price}, Active: {service.is_active}")
        
        # Check service with ID 3 specifically
        try:
            service_3 = Service.objects.get(id=3)
            print(f"\n✓ Service with ID 3 exists: {service_3.name}")
        except Service.DoesNotExist:
            print("\n✗ ERROR: Service with ID 3 does not exist in the database!")
            print("  This explains the error when creating appointments with this service ID.")
            
            # Check what IDs do exist
            existing_ids = Service.objects.values_list('id', flat=True)
            print(f"\nExisting service IDs: {list(existing_ids)}")
            print("\nYou should either:")
            print("1. Update the frontend to use only existing service IDs, or")
            print("2. Create a service with ID 3 in the database")
            
    except Exception as e:
        print(f"✗ Error querying services: {e}")

except ImportError as e:
    print(f"✗ Could not import the Service model: {e}")
    print("Verify that the registration app is properly installed and the models are defined correctly.")
