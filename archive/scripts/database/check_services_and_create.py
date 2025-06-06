import os
import sys
import django

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
        
    # Try to get services
    try:
        services = list(Service.objects.all())
        print(f"\nFound {len(services)} services:")
        
        # Print service details
        for service in services:
            print(f"ID: {service.id}, Name: {service.name}")
    except Exception as e:
        print(f"Error querying services: {str(e)}")
except Exception as e:
    print(f"Error importing Service model: {str(e)}")

# Try to create a service if none exist
try:
    from registration.models import Service
    if Service.objects.count() == 0:
        print("\nNo services found. Attempting to create test services...")
        
        # Create some test services with specific IDs
        test_services = [
            {
                'id': 1,
                'name': 'Shiatsu Test',
                'description': 'Test service',
                'duration': 60,
                'price': 500.00,
                'is_active': True
            },
            {
                'id': 2,
                'name': 'Combi Test',
                'description': 'Test service',
                'duration': 60,
                'price': 550.00,
                'is_active': True
            },
            {
                'id': 3,
                'name': 'Dry Test',
                'description': 'Test service',
                'duration': 60,
                'price': 450.00,
                'is_active': True
            }
        ]
        
        for data in test_services:
            # Use get_or_create to avoid duplicate key errors
            service, created = Service.objects.get_or_create(
                id=data['id'],
                defaults={
                    'name': data['name'],
                    'description': data['description'],
                    'duration': data['duration'],
                    'price': data['price'],
                    'is_active': data['is_active']
                }
            )
            print(f"Service {'created' if created else 'already exists'}: {service.name} (ID: {service.id})")
except Exception as e:
    print(f"\nError creating test services: {str(e)}")
