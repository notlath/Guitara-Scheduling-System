"""
This script adds missing services to the database.
It creates any services from the frontend fallback list that are missing in the database,
particularly focusing on Service with ID 3.
"""

import os
import sys
import django
from datetime import timedelta

# Set up Django environment
sys.path.append('guitara')

# We need to set up environ before loading settings
import environ
env = environ.Env()
environ.Env.read_env()  # Read .env file, if it exists

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')

try:
    django.setup()
except Exception as e:
    print(f"Error initializing Django: {e}")
    sys.exit(1)
    
print("Django setup completed successfully.")

try:
    # Import the Service model
    from registration.models import Service
    print("✓ Successfully imported Service model")
    
    # Get all services
    services = list(Service.objects.all())
    print(f"✓ Found {len(services)} services in database:")
    
    # Print existing services
    existing_ids = set()
    for service in services:
        print(f"  - ID: {service.id}, Name: {service.name}")
        existing_ids.add(service.id)
    
    # Define required services that match the frontend fallback data
    required_services = [
        {
            'id': 1,
            'name': 'Shiatsu Massage',
            'description': 'A Japanese technique involving pressure points.',
            'duration': timedelta(minutes=60),
            'price': 500.00,
            'is_active': True,
        },
        {
            'id': 2,
            'name': 'Combi Massage',
            'description': 'A combination of multiple massage techniques.',
            'duration': timedelta(minutes=60),
            'price': 550.00,
            'is_active': True,
        },
        {
            'id': 3,  # This is the problematic one
            'name': 'Dry Massage',
            'description': 'Performed without oils or lotions.',
            'duration': timedelta(minutes=60),
            'price': 450.00,
            'is_active': True,
        },
        {
            'id': 4,
            'name': 'Foot Massage',
            'description': 'Focused on the feet and lower legs.',
            'duration': timedelta(minutes=60),
            'price': 400.00,
            'is_active': True,
        },
        {
            'id': 5,
            'name': 'Hot Stone Service',
            'description': 'Uses heated stones for deep muscle relaxation.',
            'duration': timedelta(minutes=90),
            'price': 650.00,
            'is_active': True,
        },
        {
            'id': 6,
            'name': 'Ventosa',
            'description': 'Traditional cupping therapy to relieve muscle tension.',
            'duration': timedelta(minutes=45),
            'price': 450.00,
            'is_active': True,
        },
        {
            'id': 7,
            'name': 'Hand Massage',
            'description': 'Focused on hands and arms.',
            'duration': timedelta(minutes=45),
            'price': 350.00,
            'is_active': True,
        },
    ]
    
    # Create missing services - pay special attention to service ID 3
    created_count = 0
    updated_count = 0
    
    for service_data in required_services:
        service_id = service_data['id']
        
        if service_id in existing_ids:
            # Service exists, check if it needs updating
            existing_service = Service.objects.get(id=service_id)
            if (existing_service.name != service_data['name'] or 
                existing_service.description != service_data['description'] or
                existing_service.duration != service_data['duration'] or
                existing_service.price != service_data['price'] or
                existing_service.is_active != service_data['is_active']):
                
                # Update the service
                existing_service.name = service_data['name']
                existing_service.description = service_data['description']
                existing_service.duration = service_data['duration']
                existing_service.price = service_data['price']
                existing_service.is_active = service_data['is_active']
                existing_service.save()
                updated_count += 1
                print(f"  ↻ Updated service ID {service_id}: {service_data['name']}")
        else:
            # Service doesn't exist, create it
            try:
                Service.objects.create(
                    id=service_id,
                    name=service_data['name'],
                    description=service_data['description'],
                    duration=service_data['duration'],
                    price=service_data['price'],
                    is_active=service_data['is_active']
                )
                created_count += 1
                print(f"  + Created service ID {service_id}: {service_data['name']}")
            except Exception as e:
                print(f"  ! Error creating service ID {service_id}: {e}")
    
    # Summary
    print(f"\nSummary: Created {created_count} services, Updated {updated_count} services")
    
    # Check if service ID 3 exists now
    try:
        service_3 = Service.objects.get(id=3)
        print(f"✓ Service with ID 3 now exists: {service_3.name}")
    except Service.DoesNotExist:
        print("✗ ERROR: Service with ID 3 still does not exist!")

except ImportError as e:
    print(f"✗ Could not import the Service model: {e}")
    print("Verify that the registration app is properly installed.")
except Exception as e:
    print(f"✗ Unexpected error: {e}")
