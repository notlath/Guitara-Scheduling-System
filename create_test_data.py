#!/usr/bin/env python
"""
Create test data for debugging client search and materials issues
"""
import os
import sys
import django

# Setup Django
current_dir = os.path.dirname(os.path.abspath(__file__))
django_dir = os.path.join(current_dir, "guitara")
sys.path.insert(0, django_dir)
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from scheduling.models import Client
from registration.models import Service, RegistrationMaterial


def create_test_clients():
    """Create test clients including Jess/Jessica for search testing"""
    print("🔍 Creating test clients...")

    test_clients = [
        {
            "first_name": "Jessica",
            "last_name": "Smith",
            "email": "jessica.smith@example.com",
            "phone_number": "+63 912 345 6789",
            "address": "123 Main Street, Manila",
            "notes": "Test client - Jessica search",
        },
        {
            "first_name": "Jess",
            "last_name": "Rodriguez",
            "email": "jess.rodriguez@example.com",
            "phone_number": "+63 918 765 4321",
            "address": "456 Oak Avenue, Quezon City",
            "notes": "Test client - Jess search",
        },
        {
            "first_name": "Luis Gabriel",
            "last_name": "Rentoza",
            "email": "luis.rentoza@example.com",
            "phone_number": "+63 917 234 5678",
            "address": "789 Pine Road, Makati",
            "notes": "Test client - Luis search",
        },
        {
            "first_name": "Maria",
            "last_name": "Santos",
            "email": "maria.santos@example.com",
            "phone_number": "+63 915 678 9012",
            "address": "321 Bamboo Street, Cebu",
            "notes": "Test client - Maria search",
        },
    ]

    created_count = 0
    for client_data in test_clients:
        # Check if client already exists
        existing = Client.objects.filter(
            first_name=client_data["first_name"], last_name=client_data["last_name"]
        ).first()

        if not existing:
            Client.objects.create(**client_data)
            print(f"✅ Created: {client_data['first_name']} {client_data['last_name']}")
            created_count += 1
        else:
            print(
                f"⚠️ Already exists: {client_data['first_name']} {client_data['last_name']}"
            )

    print(f"Created {created_count} new clients")
    return created_count


def create_test_services_and_materials():
    """Create test services with associated materials"""
    print("\n🛠️ Creating test services and materials...")

    # Create test services
    test_services = [
        {
            "name": "Swedish Massage",
            "description": "Relaxing full-body massage",
            "duration": 60,
            "price": 1500.00,
            "oil": "Lavender Oil",
            "is_active": True,
        },
        {
            "name": "Deep Tissue Massage",
            "description": "Therapeutic deep tissue work",
            "duration": 90,
            "price": 2000.00,
            "oil": "Eucalyptus Oil",
            "is_active": True,
        },
    ]

    services_created = 0
    for service_data in test_services:
        service, created = Service.objects.get_or_create(
            name=service_data["name"], defaults=service_data
        )
        if created:
            print(f"✅ Created service: {service.name}")
            services_created += 1

            # Create materials for this service
            test_materials = [
                {
                    "name": f"{service_data['oil']}",
                    "description": f"Massage oil for {service.name}",
                    "category": "Massage Oil",
                    "unit_of_measure": "Bottle",
                    "stock_quantity": 10,
                    "service": service,
                },
                {
                    "name": "Clean Towels",
                    "description": "Fresh towels for massage session",
                    "category": "Hygiene Supplies",
                    "unit_of_measure": "Set",
                    "stock_quantity": 25,
                    "service": service,
                },
                {
                    "name": "Disposable Sheets",
                    "description": "Hygienic disposable bed sheets",
                    "category": "Hygiene Supplies",
                    "unit_of_measure": "Pack",
                    "stock_quantity": 15,
                    "service": service,
                },
            ]

            for material_data in test_materials:
                material, mat_created = RegistrationMaterial.objects.get_or_create(
                    name=material_data["name"], service=service, defaults=material_data
                )
                if mat_created:
                    print(f"  ✅ Created material: {material.name}")
        else:
            print(f"⚠️ Service already exists: {service.name}")

    print(f"Created {services_created} new services")


def verify_data():
    """Verify the test data was created successfully"""
    print("\n🔍 Verifying test data...")

    # Check clients
    total_clients = Client.objects.count()
    print(f"Total clients: {total_clients}")

    # Test search for "Jess"
    jess_clients = Client.objects.filter(
        first_name__icontains="jess"
    ) | Client.objects.filter(last_name__icontains="jess")
    print(f"Clients matching 'jess': {jess_clients.count()}")
    for client in jess_clients:
        print(f"  - {client.id}: {client.first_name} {client.last_name}")

    # Check services and materials
    total_services = Service.objects.count()
    print(f"Total services: {total_services}")

    for service in Service.objects.all()[:3]:
        materials_count = RegistrationMaterial.objects.filter(service=service).count()
        print(f"  Service '{service.name}' has {materials_count} materials")


def main():
    print("🚀 Creating test data for client search and materials debugging...")

    try:
        create_test_clients()
        create_test_services_and_materials()
        verify_data()

        print("\n✅ Test data creation completed!")
        print("\nNow you can test:")
        print("1. Frontend client search for 'Jess' or 'Jessica'")
        print("2. Service materials in appointment form")

    except Exception as e:
        print(f"❌ Error creating test data: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
