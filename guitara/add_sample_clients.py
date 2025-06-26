#!/usr/bin/env python
"""
Script to add sample clients to the scheduling_client table for testing
"""
import os
import django

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from scheduling.models import Client

def add_sample_clients():
    """Add sample clients to the database"""
    
    sample_clients = [
        {
            "first_name": "Maria",
            "last_name": "Santos",
            "email": "maria.santos@email.com",
            "phone_number": "+63 912 345 6789",
            "address": "123 Rizal Street, Makati City, Metro Manila",
            "notes": "Prefers afternoon appointments. Regular client."
        },
        {
            "first_name": "Juan", 
            "last_name": "Dela Cruz",
            "email": "juan.delacruz@gmail.com",
            "phone_number": "+63 917 234 5678",
            "address": "456 Bonifacio Avenue, Quezon City, Metro Manila",
            "notes": "Has back pain issues. Prefers medium pressure massage."
        },
        {
            "first_name": "Ana",
            "last_name": "Rodriguez",
            "email": "ana.rodriguez@yahoo.com", 
            "phone_number": "+63 920 123 4567",
            "address": "789 Luna Street, Pasig City, Metro Manila",
            "notes": "First-time client. Interested in hot stone therapy."
        },
        {
            "first_name": "Jose",
            "last_name": "Garcia", 
            "email": "jose.garcia@outlook.com",
            "phone_number": "+63 915 987 6543",
            "address": "321 Mabini Street, Mandaluyong City, Metro Manila",
            "notes": "VIP client. Prefers female therapists only."
        },
        {
            "first_name": "Carmen",
            "last_name": "Reyes",
            "email": "carmen.reyes@email.com",
            "phone_number": "+63 918 765 4321", 
            "address": "654 Escolta Street, Manila City, Metro Manila",
            "notes": "Senior client. Requires gentle pressure and accessible location."
        },
        {
            "first_name": "Roberto",
            "last_name": "Fernandez",
            "email": "",  # Some clients may not have email
            "phone_number": "+63 919 654 3210",
            "address": "987 Taft Avenue, Pasay City, Metro Manila", 
            "notes": "Cash payment only. Prefers evening appointments."
        },
        {
            "first_name": "Isabella",
            "last_name": "Torres",
            "email": "isabella.torres@gmail.com",
            "phone_number": "+63 921 543 2109",
            "address": "147 Kalayaan Avenue, Makati City, Metro Manila",
            "notes": "Regular weekly appointments. Prefers Shiatsu massage."
        },
        {
            "first_name": "Miguel",
            "last_name": "Gonzalez", 
            "email": "miguel.gonzalez@email.com",
            "phone_number": "+63 922 432 1098",
            "address": "258 EDSA, Ortigas Center, Pasig City, Metro Manila",
            "notes": "Business executive. Needs stress relief massage."
        },
        {
            "first_name": "Sofia",
            "last_name": "Morales",
            "email": "sofia.morales@yahoo.com",
            "phone_number": "+63 923 321 0987", 
            "address": "369 Ayala Avenue, Makati City, Metro Manila",
            "notes": "Pregnant client. Requires prenatal massage specialist."
        },
        {
            "first_name": "Diego",
            "last_name": "Herrera",
            "email": "diego.herrera@gmail.com",
            "phone_number": "+63 924 210 9876",
            "address": "741 Roxas Boulevard, Manila City, Metro Manila",
            "notes": "Athlete client. Needs sports massage therapy."
        }
    ]
    
    # Clear existing sample clients (optional)
    existing_count = Client.objects.count()
    print(f"Current clients in database: {existing_count}")
    
    # Add sample clients
    created_count = 0
    for client_data in sample_clients:
        # Check if client already exists (by phone number to avoid duplicates)
        if not Client.objects.filter(phone_number=client_data["phone_number"]).exists():
            client = Client.objects.create(**client_data)
            print(f"✓ Created client: {client.first_name} {client.last_name}")
            created_count += 1
        else:
            print(f"- Client with phone {client_data['phone_number']} already exists")
    
    print(f"\n✅ Added {created_count} new clients to the database")
    print(f"📊 Total clients now: {Client.objects.count()}")

if __name__ == "__main__":
    add_sample_clients()
