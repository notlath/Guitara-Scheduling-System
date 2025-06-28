#!/usr/bin/env python
"""
Simple debug script for client search
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


def main():
    print("=== CLIENT DEBUG ===")

    # Create test client if none exist
    if Client.objects.count() == 0:
        print("Creating test client...")
        Client.objects.create(
            first_name="Jessica",
            last_name="Smith",
            email="jessica@test.com",
            phone_number="+63 912 345 6789",
            address="Test Address",
            notes="Test client",
        )
        print("✅ Created Jessica Smith")

    print(f"Total clients: {Client.objects.count()}")

    # Test search
    for client in Client.objects.all()[:5]:
        print(
            f"Client {client.id}: {client.first_name} {client.last_name} - {client.phone_number}"
        )

    # Test Jess search
    jess_search = Client.objects.filter(first_name__icontains="jess")
    print(f"\nJess search results: {jess_search.count()}")
    for client in jess_search:
        print(f"  Found: {client.first_name} {client.last_name}")


if __name__ == "__main__":
    main()
