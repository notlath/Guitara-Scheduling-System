#!/usr/bin/env python
"""
Simple script to check and create clients
"""
import os
import sys
import django

# Add the parent directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from scheduling.models import Client

def main():
    print("Checking existing clients...")
    existing_clients = Client.objects.all()
    print(f"Found {existing_clients.count()} existing clients:")
    
    for client in existing_clients[:5]:  # Show first 5
        print(f"  - {client.first_name} {client.last_name} ({client.phone_number})")
    
    if existing_clients.count() == 0:
        print("\nNo clients found. Creating a sample client...")
        Client.objects.create(
            first_name="Test",
            last_name="Client",
            email="test.client@example.com",
            phone_number="+63 912 345 6789",
            address="123 Test Street, Manila",
            notes="Sample client for testing"
        )
        print("✅ Sample client created!")
    else:
        print(f"\n✅ Found {existing_clients.count()} clients in the database")

if __name__ == "__main__":
    main()
