import os
import sys
import django
from datetime import timedelta

# Set up Django environment
sys.path.append('guitara')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

# Import models
try:
    from registration.models import Service
    print("Successfully imported Service model")
    
    # Print model fields
    print("Service model fields:")
    for field in Service._meta.fields:
        print(f"  - {field.name} ({field.__class__.__name__})")
        
    # Get all services
    services = Service.objects.all()
    print(f"\nFound {services.count()} services:")
    
    # Print service details
    for service in services:
        print(f"ID: {service.id}, Name: {service.name}, Duration: {service.duration}")
    
    # Define expected services with exact IDs to match frontend fallback data
    expected_services = [
        {
            'id': 1,
            'name': 'Shiatsu Massage',
            'description': 'A Japanese technique involving pressure points.',
            'duration': timedelta(minutes=60),
            'price': 500.00,
            'is_active': True
        },
        {
            'id': 2,
            'name': 'Combi Massage',
            'description': 'A combination of multiple massage techniques.',
            'duration': timedelta(minutes=60),
            'price': 550.00,
            'is_active': True
        },
        {
            'id': 3,
            'name': 'Dry Massage',
            'description': 'Performed without oils or lotions.',
            'duration': timedelta(minutes=60),
            'price': 450.00,
            'is_active': True
        },
        {
            'id': 4,
            'name': 'Foot Massage',
            'description': 'Focused on the feet and lower legs.',
            'duration': timedelta(minutes=60),
            'price': 400.00,
            'is_active': True
        },
        {
            'id': 5,
            'name': 'Hot Stone Service',
            'description': 'Uses heated stones for deep muscle relaxation.',
            'duration': timedelta(minutes=90),
            'price': 650.00,
            'is_active': True
        },
        {
            'id': 6,
            'name': 'Ventosa',
            'description': 'Traditional cupping therapy to relieve muscle tension.',
            'duration': timedelta(minutes=45),
            'price': 450.00,
            'is_active': True
        },
        {
            'id': 7,
            'name': 'Hand Massage',
            'description': 'Focused on hands and arms.',
            'duration': timedelta(minutes=45),
            'price': 350.00,
            'is_active': True
        },
    ]
    
    # Create or update services to match expected IDs
    print("\n=== Syncing services to match frontend fallback data ===")
    for data in expected_services:
        service_id = data['id']
        
        # Check if service with this ID exists
        service = Service.objects.filter(id=service_id).first()
        
        if service:
            # Update existing service
            changed = False
            for key, value in data.items():
                if key != 'id' and getattr(service, key) != value:
                    setattr(service, key, value)
                    changed = True
            
            if changed:
                service.save()
                print(f"Updated: ID {service_id} - {data['name']}")
            else:
                print(f"No changes needed: ID {service_id} - {data['name']}")
        else:
            # Create new service with specific ID
            new_service = Service.objects.create(**data)
            print(f"Created: ID {service_id} - {data['name']}")
    
    # Final check
    print("\nServices after sync:")
    for service in Service.objects.all().order_by('id'):
        print(f"ID: {service.id}, Name: {service.name}")
        
except Exception as e:
    print(f"Error: {str(e)}")
