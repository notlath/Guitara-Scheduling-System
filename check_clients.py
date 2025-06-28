#!/usr/bin/env python
"""
Simple script to check and create clients
"""
import os
import sys
import django

# Change to the guitara directory which contains manage.py
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'guitara'))
os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'guitara'))

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

# Now we can import from the app
from scheduling.models import Client


def main():
    print("Checking existing clients...")
    existing_clients = Client.objects.all()
    print(f"Found {existing_clients.count()} existing clients:")

    for client in existing_clients[:10]:  # Show first 10
        print(f"  - {client.first_name} {client.last_name} ({client.phone_number}) - Email: {client.email}")

    if existing_clients.count() == 0:
        print("\nNo clients found. Creating sample clients...")
        # Create multiple test clients including one named Jessica/Jess
        test_clients = [
            {
                "first_name": "Jessica",
                "last_name": "Smith", 
                "email": "jessica.smith@example.com",
                "phone_number": "+63 912 345 6789",
                "address": "123 Main Street, Manila",
                "notes": "Sample client for testing - Jessica/Jess search"
            },
            {
                "first_name": "Jess",
                "last_name": "Rodriguez",
                "email": "jess.rodriguez@example.com", 
                "phone_number": "+63 918 765 4321",
                "address": "456 Oak Avenue, Quezon City",
                "notes": "Sample client for testing - Jess search"
            },
            {
                "first_name": "Luis Gabriel",
                "last_name": "Rentoza",
                "email": "luis.rentoza@example.com",
                "phone_number": "+63 917 234 5678",
                "address": "789 Pine Road, Makati",
                "notes": "Sample client mentioned in debug guide"
            },
            {
                "first_name": "Maria",
                "last_name": "Santos",
                "email": "maria.santos@example.com",
                "phone_number": "+63 915 678 9012",
                "address": "321 Bamboo Street, Cebu",
                "notes": "Another test client"
            }
        ]
        
        for client_data in test_clients:
            Client.objects.create(**client_data)
            print(f"✅ Created client: {client_data['first_name']} {client_data['last_name']}")
        
        print(f"\n✅ Created {len(test_clients)} sample clients!")
    else:
        print(f"\n✅ Found {existing_clients.count()} clients in the database")
        
        # Test search functionality
        print("\n🔍 Testing search functionality...")
        search_terms = ["jess", "Jess", "Jessica", "luis", "gabriel"]
        
        for term in search_terms:
            print(f"\nSearching for '{term}':")
            # Case-insensitive search in first_name and last_name
            results = Client.objects.filter(
                first_name__icontains=term
            ) | Client.objects.filter(
                last_name__icontains=term
            )
            
            print(f"  Found {results.count()} results:")
            for client in results:
                print(f"    - {client.first_name} {client.last_name} ({client.phone_number})")
                
        # Test phone number search
        print(f"\nSearching by phone number '912':")
        phone_results = Client.objects.filter(phone_number__icontains="912")
        print(f"  Found {phone_results.count()} results:")
        for client in phone_results:
            print(f"    - {client.first_name} {client.last_name} ({client.phone_number})")


if __name__ == "__main__":
    main()
