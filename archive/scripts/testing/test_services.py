"""
This script tests if we can import and use the Service model correctly.
"""

import os
import sys
import django

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

# Try importing Service model
try:
    from registration.models import Service
    print("✓ Successfully imported Service model")
    
    # Try querying services
    try:
        services = Service.objects.all()
        print(f"✓ Successfully queried Service model. Found {services.count()} services.")
        
        # List all services
        for service in services:
            print(f"  - {service}")
        
        # Try creating a test service if none exist
        if not services.exists():
            print("\nCreating test services...")
            # Create services
            services_data = [
                {
                    'name': 'Shiatsu Massage',
                    'description': 'A Japanese technique involving pressure points.',
                    'duration': 60,  # 1 hour
                    'price': 500.00,
                },
                {
                    'name': 'Combi Massage',
                    'description': 'A combination of multiple massage techniques.',
                    'duration': 60,
                    'price': 550.00,
                },
                {
                    'name': 'Dry Massage',
                    'description': 'Performed without oils or lotions.',
                    'duration': 60,
                    'price': 450.00,
                },
                {
                    'name': 'Foot Massage',
                    'description': 'Focused on the feet and lower legs.',
                    'duration': 60,
                    'price': 400.00,
                },
                {
                    'name': 'Hot Stone Service',
                    'description': 'Uses heated stones for deep muscle relaxation.',
                    'duration': 90,  # 1.5 hours
                    'price': 650.00,
                },
                {
                    'name': 'Ventosa',
                    'description': 'Traditional cupping therapy to relieve muscle tension.',
                    'duration': 45,  # 45 minutes
                    'price': 450.00,
                },
                {
                    'name': 'Hand Massage',
                    'description': 'Focused on hands and arms.',
                    'duration': 45,  # 45 minutes
                    'price': 350.00,
                },
            ]
            
            for service_data in services_data:
                service = Service.objects.create(**service_data)
                print(f"  Created: {service}")

    except Exception as e:
        print(f"✗ Error querying Service model: {e}")
except ImportError as e:
    print(f"✗ Error importing Service model: {e}")

# Try importing ServiceSerializer
try:
    from scheduling.serializers import ServiceSerializer
    print("\n✓ Successfully imported ServiceSerializer")
except ImportError as e:
    print(f"\n✗ Error importing ServiceSerializer: {e}")

print("\nDone!")
