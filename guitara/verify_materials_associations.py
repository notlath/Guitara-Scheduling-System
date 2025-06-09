#!/usr/bin/env python
"""
Script to verify that materials are properly created and associated with services.
Run this script from the guitara directory using: python verify_materials_associations.py
"""

import os
import sys
import django

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from registration.models import Service, Material
from datetime import timedelta
from decimal import Decimal


def create_and_verify_materials():
    """Create materials and verify their associations with services"""

    print("=== Creating Materials ===")

    # Materials data from the management command
    materials_data = [
        {
            "name": "Lavender Oil",
            "description": "Premium lavender essential oil for aromatherapy and relaxation massages",
            "category": "Massage Oil",
            "unit_of_measure": "Bottle",
            "stock_quantity": 50,
            "auto_deduct": True,
            "reusable": False,
        },
        {
            "name": "Peppermint Oil",
            "description": "Refreshing peppermint oil for foot and therapeutic massages",
            "category": "Massage Oil",
            "unit_of_measure": "Bottle",
            "stock_quantity": 30,
            "auto_deduct": True,
            "reusable": False,
        },
        {
            "name": "Massage Lotion",
            "description": "High-quality massage lotion for smooth skin contact during therapy",
            "category": "Massage Supplies",
            "unit_of_measure": "Tub",
            "stock_quantity": 40,
            "auto_deduct": True,
            "reusable": False,
        },
        {
            "name": "Alcohol Spray",
            "description": "Disinfectant alcohol spray for sanitizing equipment and surfaces",
            "category": "Hygiene Supplies",
            "unit_of_measure": "Spray Bottle",
            "stock_quantity": 25,
            "auto_deduct": True,
            "reusable": True,
        },
        {
            "name": "Ventosa Glass Bottles",
            "description": "Traditional glass bottles used for cupping therapy treatments",
            "category": "Ventosa Supplies",
            "unit_of_measure": "Set",
            "stock_quantity": 15,
            "auto_deduct": False,
            "reusable": True,
        },
        {
            "name": "Hot Stone Kit",
            "description": "Complete set of heated stones for hot stone massage therapy",
            "category": "Equipment",
            "unit_of_measure": "Set",
            "stock_quantity": 8,
            "auto_deduct": False,
            "reusable": True,
        },
    ]

    created_materials = []
    for material_data in materials_data:
        material, created = Material.objects.get_or_create(
            name=material_data["name"], defaults=material_data
        )
        if created:
            print(f"✓ Created material: {material.name}")
            created_materials.append(material)
        else:
            print(f"→ Material already exists: {material.name}")

    return created_materials


def associate_materials_with_services():
    """Associate specific materials with relevant services"""
    associations = [
        ("Shiatsu massage", ["Lavender Oil", "Alcohol Spray"]),
        ("Combi massage", ["Massage Lotion", "Alcohol Spray"]),
        ("Dry massage", ["Alcohol Spray"]),
        ("Foot massage", ["Peppermint Oil", "Alcohol Spray"]),
        ("Hotstone service", ["Lavender Oil", "Hot Stone Kit", "Alcohol Spray"]),
        ("Ventosa", ["Massage Lotion", "Ventosa Glass Bottles", "Alcohol Spray"]),
        ("Hand massage", ["Massage Lotion", "Alcohol Spray"]),
    ]

    print("\n=== Associating Materials with Services ===")
    for service_name, material_names in associations:
        try:
            service = Service.objects.get(name=service_name)
            for material_name in material_names:
                try:
                    material = Material.objects.get(name=material_name)
                    material.service = service
                    material.save()
                    print(f"✓ Associated {material_name} with {service_name}")
                except Material.DoesNotExist:
                    print(f"✗ Material not found: {material_name}")
        except Service.DoesNotExist:
            print(f"✗ Service not found: {service_name}")


def verify_database_state():
    """Verify the current state of services and materials in the database"""

    print("\n=== Database Verification ===")

    # Count totals
    total_services = Service.objects.count()
    total_materials = Material.objects.count()

    print(f"Total Services in database: {total_services}")
    print(f"Total Materials in database: {total_materials}")

    # List all services
    print("\n=== Services List ===")
    services = Service.objects.all()
    for service in services:
        duration_minutes = (
            service.duration.total_seconds() // 60 if service.duration else 0
        )
        print(f"• {service.name} - {duration_minutes:.0f} min - ₱{service.price}")

    # List all materials with their service associations
    print("\n=== Materials List with Service Associations ===")
    materials = Material.objects.all()
    for material in materials:
        service_name = material.service.name if material.service else "⚠️  NOT ASSIGNED"
        auto_deduct_status = "Auto-deduct" if material.auto_deduct else "Manual"
        reusable_status = "Reusable" if material.reusable else "Single-use"

        print(f"• {material.name}")
        print(f"  Category: {material.category}")
        print(f"  Stock: {material.stock_quantity} {material.unit_of_measure}")
        print(f"  Service: {service_name}")
        print(f"  Properties: {auto_deduct_status}, {reusable_status}")
        print()

    # Verify associations by service
    print("=== Service-Material Associations Verification ===")
    for service in services:
        associated_materials = Material.objects.filter(service=service)
        material_names = [m.name for m in associated_materials]
        print(
            f"• {service.name}: {', '.join(material_names) if material_names else 'No materials assigned'}"
        )

    # Check for unassigned materials
    unassigned_materials = Material.objects.filter(service__isnull=True)
    if unassigned_materials:
        print(
            f"\n⚠️  WARNING: {unassigned_materials.count()} materials are not assigned to any service:"
        )
        for material in unassigned_materials:
            print(f"  - {material.name}")
    else:
        print(f"\n✅ All materials are properly assigned to services!")


def main():
    print("=== Material Creation and Association Verification ===\n")

    # Check if services exist first
    if Service.objects.count() == 0:
        print("⚠️  No services found in database. Please run service creation first.")
        print("You can run: python manage.py populate_data")
        return

    # Create materials
    created_materials = create_and_verify_materials()

    # Associate materials with services
    associate_materials_with_services()

    # Verify the final state
    verify_database_state()

    print(f"\n=== Summary ===")
    print(f"Materials created in this run: {len(created_materials)}")
    print("✅ Material creation and association verification complete!")


if __name__ == "__main__":
    main()
