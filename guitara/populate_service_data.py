#!/usr/bin/env python
"""
Script to populate the database with service and material data.
Run this script from the guitara directory using: python populate_service_data.py
"""

import os
import sys
import django
from datetime import timedelta
from decimal import Decimal
import random

# Add the current directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "settings")
django.setup()

from registration.models import Service, Material
from scheduling.models import Client


def create_services():
    """Create services based on the provided data"""
    services_data = [
        {
            "name": "Shiatsu massage",
            "description": "Traditional Japanese massage technique focusing on pressure points",
            "duration": timedelta(minutes=60),
            "price": Decimal("500.00"),
            "oil": "Essential oil blend",
        },
        {
            "name": "Combi massage",
            "description": "Combination massage therapy with multiple techniques",
            "duration": timedelta(minutes=60),
            "price": Decimal("400.00"),
            "oil": "Therapeutic massage oil",
        },
        {
            "name": "Dry massage",
            "description": "Massage therapy without oils or lotions",
            "duration": timedelta(minutes=60),
            "price": Decimal("500.00"),
            "oil": None,
        },
        {
            "name": "Foot massage",
            "description": "Relaxing foot and lower leg massage therapy",
            "duration": timedelta(minutes=60),
            "price": Decimal("500.00"),
            "oil": "Peppermint oil blend",
        },
        {
            "name": "Hotstone service",
            "description": "Hot stone massage therapy for deep muscle relaxation",
            "duration": timedelta(minutes=90),
            "price": Decimal("675.00"),
            "oil": "Lavender oil",
        },
        {
            "name": "Ventosa",
            "description": "Cupping therapy using glass bottles for circulation",
            "duration": timedelta(minutes=90),
            "price": Decimal("675.00"),
            "oil": "Light massage oil",
        },
        {
            "name": "Hand massage",
            "description": "Therapeutic hand and wrist massage",
            "duration": timedelta(minutes=60),
            "price": Decimal("450.00"),
            "oil": "Hand cream lotion",
        },
    ]

    created_services = []
    for service_data in services_data:
        service, created = Service.objects.get_or_create(
            name=service_data["name"], defaults=service_data
        )
        if created:
            print(f"✓ Created service: {service.name}")
            created_services.append(service)
        else:
            print(f"→ Service already exists: {service.name}")

    return created_services


def create_materials():
    """Create materials based on the provided data"""
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


def create_clients():
    """Create generic Filipino clients with Pasig City addresses"""

    # Common Filipino first names
    filipino_first_names = [
        "Maria",
        "Jose",
        "Juan",
        "Ana",
        "Antonio",
        "Carmen",
        "Francisco",
        "Rosa",
        "Manuel",
        "Teresa",
        "Pedro",
        "Luz",
        "Miguel",
        "Esperanza",
        "Ricardo",
        "Remedios",
        "Roberto",
        "Cristina",
        "Eduardo",
        "Josefina",
        "Carlos",
        "Dolores",
        "Fernando",
        "Gloria",
        "Rafael",
        "Leonora",
        "Ramon",
        "Felisa",
        "Alejandro",
        "Elena",
        "Luis",
        "Rosario",
        "Daniel",
        "Maricel",
        "Mark",
        "Mary Grace",
        "John Paul",
        "Princess",
        "Kristine",
        "Michael",
        "Angel",
        "Jhon",
        "Mary Ann",
        "Kenneth",
        "Joy",
        "Christian",
        "Lovely",
        "Jerome",
        "Rose",
        "Jerico",
        "Faith",
        "Joshua",
        "Hope",
        "Patrick",
        "Cherry",
    ]

    # Common Filipino last names
    filipino_last_names = [
        "Santos",
        "Reyes",
        "Cruz",
        "Bautista",
        "Ocampo",
        "Garcia",
        "Mendoza",
        "Torres",
        "Tomas",
        "Andres",
        "Marquez",
        "Romualdez",
        "Mercado",
        "Aguilar",
        "Flores",
        "Ramos",
        "Valdez",
        "Castillo",
        "Morales",
        "Aquino",
        "Villanueva",
        "Francisco",
        "Soriano",
        "Tolentino",
        "Gonzales",
        "Manalo",
        "Santiago",
        "Alvarez",
        "Hernandez",
        "Pascual",
        "Dela Cruz",
        "Jimenez",
        "Dizon",
        "Perez",
        "Lopez",
        "Gutierrez",
        "Salazar",
        "Navarro",
        "Dimaculangan",
        "Magbanua",
        "Lim",
        "Tan",
        "Go",
        "Chua",
        "Wong",
        "Lee",
        "Ong",
        "Sy",
        "Co",
    ]

    # Pasig City areas and streets
    pasig_addresses = [
        "123 Ortigas Avenue, Ortigas Center, Pasig City",
        "456 C. Raymundo Avenue, Maybunga, Pasig City",
        "789 Shaw Boulevard, Capitol Site, Pasig City",
        "321 Meralco Avenue, Ugong Norte, Pasig City",
        "654 Dr. Sixto Antonio Avenue, Kapasigan, Pasig City",
        "987 Caruncho Avenue, Pasig Heights, Pasig City",
        "147 Julia Vargas Avenue, Ortigas Center, Pasig City",
        "258 F. Legaspi Street, Oranbo, Pasig City",
        "369 Mercedes Avenue, San Miguel, Pasig City",
        "741 Estrella Street, Santolan, Pasig City",
        "852 Pioneer Street, Buting, Pasig City",
        "963 Rosario Bridge, Rosario, Pasig City",
        "159 Bambang Street, Bambang, Pasig City",
        "357 Manggahan Street, Manggahan, Pasig City",
        "468 Pinagbuhatan Road, Pinagbuhatan, Pasig City",
        "579 Sagad Street, Sagad, Pasig City",
        "681 Tiendesitas Drive, Ugong Norte, Pasig City",
        "792 Emerald Avenue, Ortigas Center, Pasig City",
        "814 Ruby Road, Kapitolyo, Pasig City",
        "925 Sapphire Street, San Antonio, Pasig City",
        "136 Diamond Drive, Dela Paz, Pasig City",
        "247 Pearl Lane, Pineda, Pasig City",
        "358 Gold Street, Kalawaan, Pasig City",
        "469 Silver Avenue, Malinao, Pasig City",
        "571 Bronze Boulevard, Caniogan, Pasig City",
        "682 Copper Circle, Maybunga, Pasig City",
        "793 Platinum Plaza, Bagong Ilog, Pasig City",
        "815 Titanium Terrace, Bagong Katipunan, Pasig City",
        "926 Iron Street, San Joaquin, Pasig City",
        "137 Steel Square, Sto. Tomas, Pasig City",
    ]

    # Generate phone numbers (Philippine format)
    def generate_phone():
        prefixes = [
            "0917",
            "0918",
            "0919",
            "0920",
            "0921",
            "0922",
            "0923",
            "0924",
            "0925",
            "0926",
            "0927",
            "0928",
            "0929",
            "0939",
            "0949",
            "0999",
        ]
        prefix = random.choice(prefixes)
        suffix = "".join([str(random.randint(0, 9)) for _ in range(7)])
        return f"{prefix}{suffix}"

    # Generate email addresses
    def generate_email(first_name, last_name):
        domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"]
        first_clean = first_name.lower().replace(" ", "").replace("-", "")
        last_clean = last_name.lower().replace(" ", "").replace("-", "")

        patterns = [
            f"{first_clean}.{last_clean}",
            f"{first_clean}{last_clean}",
            f"{first_clean}_{last_clean}",
            f"{first_clean}{random.randint(1, 999)}",
            f"{last_clean}{first_clean[:3]}",
        ]

        email_prefix = random.choice(patterns)
        domain = random.choice(domains)
        return f"{email_prefix}@{domain}"

    # Sample notes for variety
    sample_notes = [
        "Regular client, prefers morning appointments",
        "Has back issues, needs gentle pressure",
        "Allergic to strong scents",
        "First-time client",
        "Prefers female therapist",
        "Senior citizen discount applicable",
        "Frequent client, has membership package",
        "Prefers weekend appointments",
        "Has mobility issues, may need assistance",
        "Enjoys hot stone therapy",
        "",  # Some clients have no notes
        "",
        "",
    ]

    created_clients = []

    # Generate 30 clients for the main script (smaller number)
    for i in range(30):
        first_name = random.choice(filipino_first_names)
        last_name = random.choice(filipino_last_names)
        email = generate_email(first_name, last_name)
        phone = generate_phone()
        address = random.choice(pasig_addresses)
        notes = random.choice(sample_notes)

        # Check if client already exists
        existing_client = Client.objects.filter(
            first_name=first_name, last_name=last_name, phone_number=phone
        ).first()

        if not existing_client:
            client = Client.objects.create(
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone_number=phone,
                address=address,
                notes=notes if notes else None,
            )
            print(f"✓ Created client: {client.first_name} {client.last_name}")
            created_clients.append(client)
        else:
            print(
                f"→ Client already exists: {existing_client.first_name} {existing_client.last_name}"
            )

    return created_clients


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

    print("\n--- Associating Materials with Services ---")
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


def create_clients():
    """Create generic Filipino clients with Pasig City addresses"""

    # Common Filipino first names
    filipino_first_names = [
        "Maria",
        "Jose",
        "Juan",
        "Ana",
        "Antonio",
        "Carmen",
        "Francisco",
        "Rosa",
        "Manuel",
        "Teresa",
        "Pedro",
        "Luz",
        "Miguel",
        "Esperanza",
        "Ricardo",
        "Remedios",
        "Roberto",
        "Cristina",
        "Eduardo",
        "Josefina",
        "Carlos",
        "Dolores",
        "Fernando",
        "Gloria",
        "Rafael",
        "Leonora",
        "Ramon",
        "Felisa",
        "Alejandro",
        "Elena",
        "Luis",
        "Rosario",
        "Daniel",
        "Maricel",
        "Mark",
        "Mary Grace",
        "John Paul",
        "Princess",
        "Kristine",
        "Michael",
        "Angel",
        "Jhon",
        "Mary Ann",
        "Kenneth",
        "Joy",
        "Christian",
        "Lovely",
        "Jerome",
        "Rose",
        "Jerico",
        "Faith",
        "Joshua",
        "Hope",
        "Patrick",
        "Cherry",
    ]

    # Common Filipino last names
    filipino_last_names = [
        "Santos",
        "Reyes",
        "Cruz",
        "Bautista",
        "Ocampo",
        "Garcia",
        "Mendoza",
        "Torres",
        "Tomas",
        "Andres",
        "Marquez",
        "Romualdez",
        "Mercado",
        "Aguilar",
        "Flores",
        "Ramos",
        "Valdez",
        "Castillo",
        "Morales",
        "Aquino",
        "Villanueva",
        "Francisco",
        "Soriano",
        "Tolentino",
        "Gonzales",
        "Manalo",
        "Santiago",
        "Alvarez",
        "Hernandez",
        "Pascual",
        "Dela Cruz",
        "Jimenez",
        "Dizon",
        "Perez",
        "Lopez",
        "Gutierrez",
        "Salazar",
        "Navarro",
        "Dimaculangan",
        "Magbanua",
        "Lim",
        "Tan",
        "Go",
        "Chua",
        "Wong",
        "Lee",
        "Ong",
        "Sy",
        "Co",
    ]

    # Pasig City areas and streets
    pasig_addresses = [
        "123 Ortigas Avenue, Ortigas Center, Pasig City",
        "456 C. Raymundo Avenue, Maybunga, Pasig City",
        "789 Shaw Boulevard, Capitol Site, Pasig City",
        "321 Meralco Avenue, Ugong Norte, Pasig City",
        "654 Dr. Sixto Antonio Avenue, Kapasigan, Pasig City",
        "987 Caruncho Avenue, Pasig Heights, Pasig City",
        "147 Julia Vargas Avenue, Ortigas Center, Pasig City",
        "258 F. Legaspi Street, Oranbo, Pasig City",
        "369 Mercedes Avenue, San Miguel, Pasig City",
        "741 Estrella Street, Santolan, Pasig City",
        "852 Pioneer Street, Buting, Pasig City",
        "963 Rosario Bridge, Rosario, Pasig City",
        "159 Bambang Street, Bambang, Pasig City",
        "357 Manggahan Street, Manggahan, Pasig City",
        "468 Pinagbuhatan Road, Pinagbuhatan, Pasig City",
        "579 Sagad Street, Sagad, Pasig City",
        "681 Tiendesitas Drive, Ugong Norte, Pasig City",
        "792 Emerald Avenue, Ortigas Center, Pasig City",
        "814 Ruby Road, Kapitolyo, Pasig City",
        "925 Sapphire Street, San Antonio, Pasig City",
        "136 Diamond Drive, Dela Paz, Pasig City",
        "247 Pearl Lane, Pineda, Pasig City",
        "358 Gold Street, Kalawaan, Pasig City",
        "469 Silver Avenue, Malinao, Pasig City",
        "571 Bronze Boulevard, Caniogan, Pasig City",
        "682 Copper Circle, Maybunga, Pasig City",
        "793 Platinum Plaza, Bagong Ilog, Pasig City",
        "815 Titanium Terrace, Bagong Katipunan, Pasig City",
        "926 Iron Street, San Joaquin, Pasig City",
        "137 Steel Square, Sto. Tomas, Pasig City",
    ]

    # Generate phone numbers (Philippine format)
    def generate_phone():
        prefixes = [
            "0917",
            "0918",
            "0919",
            "0920",
            "0921",
            "0922",
            "0923",
            "0924",
            "0925",
            "0926",
            "0927",
            "0928",
            "0929",
            "0939",
            "0949",
            "0999",
        ]
        prefix = random.choice(prefixes)
        suffix = "".join([str(random.randint(0, 9)) for _ in range(7)])
        return f"{prefix}{suffix}"

    # Generate email addresses
    def generate_email(first_name, last_name):
        domains = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com"]
        first_clean = first_name.lower().replace(" ", "").replace("-", "")
        last_clean = last_name.lower().replace(" ", "").replace("-", "")

        patterns = [
            f"{first_clean}.{last_clean}",
            f"{first_clean}{last_clean}",
            f"{first_clean}_{last_clean}",
            f"{first_clean}{random.randint(1, 999)}",
            f"{last_clean}{first_clean[:3]}",
        ]

        email_prefix = random.choice(patterns)
        domain = random.choice(domains)
        return f"{email_prefix}@{domain}"

    # Sample notes for variety
    sample_notes = [
        "Regular client, prefers morning appointments",
        "Has back issues, needs gentle pressure",
        "Allergic to strong scents",
        "First-time client",
        "Prefers female therapist",
        "Senior citizen discount applicable",
        "Frequent client, has membership package",
        "Prefers weekend appointments",
        "Has mobility issues, may need assistance",
        "Enjoys hot stone therapy",
        "",  # Some clients have no notes
        "",
        "",
    ]

    created_clients = []

    # Generate 30 clients
    for i in range(30):
        first_name = random.choice(filipino_first_names)
        last_name = random.choice(filipino_last_names)
        email = generate_email(first_name, last_name)
        phone = generate_phone()
        address = random.choice(pasig_addresses)
        notes = random.choice(sample_notes)

        # Check if client already exists
        existing_client = Client.objects.filter(
            first_name=first_name, last_name=last_name, phone_number=phone
        ).first()

        if not existing_client:
            client = Client.objects.create(
                first_name=first_name,
                last_name=last_name,
                email=email,
                phone_number=phone,
                address=address,
                notes=notes if notes else None,
            )
            print(f"✓ Created client: {client.first_name} {client.last_name}")
            created_clients.append(client)
        else:
            print(
                f"→ Client already exists: {existing_client.first_name} {existing_client.last_name}"
            )

    return created_clients


def main():
    print("=== Populating Database with Service, Material, and Client Data ===\n")

    print("--- Creating Services ---")
    created_services = create_services()

    print("\n--- Creating Materials ---")
    created_materials = create_materials()

    # Associate materials with services
    associate_materials_with_services()

    print("\n--- Creating Filipino Clients in Pasig City ---")
    created_clients = create_clients()

    print(f"\n=== Summary ===")
    print(f"Total Services in database: {Service.objects.count()}")
    print(f"Total Materials in database: {Material.objects.count()}")
    print(f"Total Clients in database: {Client.objects.count()}")
    print(f"Services created in this run: {len(created_services)}")
    print(f"Materials created in this run: {len(created_materials)}")
    print(f"Clients created in this run: {len(created_clients)}")

    print("\n=== Services List ===")
    for service in Service.objects.all():
        print(
            f"• {service.name} - {service.duration.total_seconds() // 60:.0f} min - ₱{service.price}"
        )

    print("\n=== Materials List ===")
    for material in Material.objects.all():
        service_name = material.service.name if material.service else "Not assigned"
        print(
            f"• {material.name} ({material.category}) - Stock: {material.stock_quantity} - Service: {service_name}"
        )

    print("\n=== Sample Clients ===")
    sample_clients = Client.objects.all()[:5]  # Show first 5 clients
    for client in sample_clients:
        print(f"• {client.first_name} {client.last_name}")
        print(f"  Phone: {client.phone_number}")
        print(f"  Address: {client.address}")
        if client.notes:
            print(f"  Notes: {client.notes}")
        print()


if __name__ == "__main__":
    main()
