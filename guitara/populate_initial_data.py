#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from django.contrib.auth.hashers import make_password
from core.models import CustomUser
from registration.models import Operator, Therapist, Driver, Service, Material


def create_initial_data():
    print("Creating initial data for Royal Care Scheduling System...")

    # Create Users
    print("\n1. Creating users...")

    # Create operator user
    operator_user, created = CustomUser.objects.get_or_create(
        username="operator1",
        defaults={
            "email": "operator@royalcare.com",
            "password": make_password("operator123"),
            "first_name": "Maria",
            "last_name": "Santos",
            "role": "operator",
            "is_active": True,
        },
    )
    if created:
        print(f"✓ Created operator user: {operator_user.username}")
    else:
        print(f"✓ Operator user already exists: {operator_user.username}")

    # Create therapist users
    therapist_users = [
        {
            "username": "therapist1",
            "email": "therapist1@royalcare.com",
            "first_name": "Anna",
            "last_name": "Rodriguez",
            "specialization": "Physical Therapy",
        },
        {
            "username": "therapist2",
            "email": "therapist2@royalcare.com",
            "first_name": "John",
            "last_name": "Cruz",
            "specialization": "Occupational Therapy",
        },
        {
            "username": "therapist3",
            "email": "therapist3@royalcare.com",
            "first_name": "Lisa",
            "last_name": "Dela Cruz",
            "specialization": "Speech Therapy",
        },
    ]

    created_therapist_users = []
    for therapist_data in therapist_users:
        user, created = CustomUser.objects.get_or_create(
            username=therapist_data["username"],
            defaults={
                "email": therapist_data["email"],
                "password": make_password("therapist123"),
                "first_name": therapist_data["first_name"],
                "last_name": therapist_data["last_name"],
                "role": "therapist",
                "is_active": True,
            },
        )
        created_therapist_users.append((user, therapist_data["specialization"]))
        if created:
            print(f"✓ Created therapist user: {user.username}")
        else:
            print(f"✓ Therapist user already exists: {user.username}")

    # Create driver users
    driver_users = [
        {
            "username": "driver1",
            "email": "driver1@royalcare.com",
            "first_name": "Carlos",
            "last_name": "Mendoza",
            "vehicle": "Toyota Hiace (ABC-1234)",
        },
        {
            "username": "driver2",
            "email": "driver2@royalcare.com",
            "first_name": "Miguel",
            "last_name": "Reyes",
            "vehicle": "Nissan Urvan (DEF-5678)",
        },
    ]

    created_driver_users = []
    for driver_data in driver_users:
        user, created = CustomUser.objects.get_or_create(
            username=driver_data["username"],
            defaults={
                "email": driver_data["email"],
                "password": make_password("driver123"),
                "first_name": driver_data["first_name"],
                "last_name": driver_data["last_name"],
                "role": "driver",
                "is_active": True,
            },
        )
        created_driver_users.append((user, driver_data["vehicle"]))
        if created:
            print(f"✓ Created driver user: {user.username}")
        else:
            print(f"✓ Driver user already exists: {user.username}")

    # Create Operator profile
    print("\n2. Creating operator profile...")
    operator, created = Operator.objects.get_or_create(
        username=operator_user.username,
        defaults={
            "first_name": operator_user.first_name,
            "last_name": operator_user.last_name,
            "email": operator_user.email,
        },
    )
    if created:
        print(
            f"✓ Created operator profile for: {operator.first_name} {operator.last_name}"
        )
    else:
        print(
            f"✓ Operator profile already exists for: {operator.first_name} {operator.last_name}"
        )

    # Create Therapist profiles
    print("\n3. Creating therapist profiles...")
    for user, specialization in created_therapist_users:
        therapist, created = Therapist.objects.get_or_create(
            username=user.username,
            defaults={
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "specialization": specialization,
            },
        )
        if created:
            print(
                f"✓ Created therapist profile: {therapist.first_name} {therapist.last_name} - {specialization}"
            )
        else:
            print(
                f"✓ Therapist profile already exists: {therapist.first_name} {therapist.last_name}"
            )

    # Create Driver profiles
    print("\n4. Creating driver profiles...")
    for user, vehicle in created_driver_users:
        driver, created = Driver.objects.get_or_create(
            username=user.username,
            defaults={
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
            },
        )
        if created:
            print(f"✓ Created driver profile: {driver.first_name} {driver.last_name}")
        else:
            print(
                f"✓ Driver profile already exists: {driver.first_name} {driver.last_name}"
            )

    # Create Materials
    print("\n5. Creating materials...")
    materials_data = [
        {
            "name": "Exercise Mat",
            "description": "Yoga/exercise mat for therapy sessions",
            "category": "Equipment",
        },
        {
            "name": "Resistance Bands",
            "description": "Elastic bands for strength training",
            "category": "Equipment",
        },
        {
            "name": "Therapy Ball",
            "description": "Large exercise ball for balance and core work",
            "category": "Equipment",
        },
        {
            "name": "Hot Pack",
            "description": "Heat therapy pack for muscle relaxation",
            "category": "Equipment",
        },
        {
            "name": "Cold Pack",
            "description": "Ice pack for inflammation reduction",
            "category": "Equipment",
        },
        {
            "name": "Massage Oil",
            "description": "Therapeutic massage oil",
            "category": "Massage Oil",
        },
        {
            "name": "Walking Aids",
            "description": "Crutches, walkers, and canes",
            "category": "Equipment",
        },
        {
            "name": "Speech Therapy Cards",
            "description": "Visual aids for speech therapy",
            "category": "Other",
        },
    ]

    for material_data in materials_data:
        material, created = Material.objects.get_or_create(
            name=material_data["name"],
            defaults={
                "description": material_data["description"],
                "category": material_data["category"],
                "stock_quantity": 10,
                "reusable": True,
            },
        )
        if created:
            print(f"✓ Created material: {material.name}")
        else:
            print(f"✓ Material already exists: {material.name}")

    # Create Services
    print("\n6. Creating services...")
    services_data = [
        {
            "name": "Physical Therapy - Home Visit",
            "description": "Comprehensive physical therapy session at patient home",
            "price": 1200.00,
            "duration": 90,
        },
        {
            "name": "Occupational Therapy - Home Visit",
            "description": "Occupational therapy focusing on daily living skills",
            "price": 1000.00,
            "duration": 60,
        },
        {
            "name": "Speech Therapy - Home Visit",
            "description": "Speech and language therapy session",
            "price": 900.00,
            "duration": 60,
        },
        {
            "name": "Massage Therapy - Home Visit",
            "description": "Therapeutic massage for muscle relaxation",
            "price": 800.00,
            "duration": 60,
            "oil": "Relaxing Essential Oil",
        },
        {
            "name": "Physical Therapy - Multiple Sessions",
            "description": "Package of 5 physical therapy sessions",
            "price": 5500.00,
            "duration": 450,
        },
    ]

    for service_data in services_data:
        service, created = Service.objects.get_or_create(
            name=service_data["name"],
            defaults={
                "description": service_data["description"],
                "price": service_data["price"],
                "duration": service_data["duration"],
                "oil": service_data.get("oil", ""),
                "is_active": True,
            },
        )

        if created:
            print(f"✓ Created service: {service.name} - ₱{service.price}")
        else:
            print(f"✓ Service already exists: {service.name}")

    # Print summary
    print("\n" + "=" * 60)
    print("DATABASE POPULATION COMPLETE!")
    print("=" * 60)
    print(f"Users created: {CustomUser.objects.count()}")
    print(f"Operators: {Operator.objects.count()}")
    print(f"Therapists: {Therapist.objects.count()}")
    print(f"Drivers: {Driver.objects.count()}")
    print(f"Services: {Service.objects.count()}")
    print(f"Materials: {Material.objects.count()}")
    print("\nLogin credentials:")
    print("- Operator: operator1 / operator123")
    print("- Therapists: therapist1, therapist2, therapist3 / therapist123")
    print("- Drivers: driver1, driver2 / driver123")
    print("=" * 60)


if __name__ == "__main__":
    create_initial_data()
