#!/usr/bin/env python
"""
Test script to verify backend search functionality
"""
import os
import sys
import django
from django.conf import settings

# Setup Django environment
sys.path.append(os.path.join(os.path.dirname(__file__), "guitara"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

from django.db.models import Q
from scheduling.models import Client
from registration.models import Service


def test_client_search():
    """Test client search functionality"""
    print("Testing Client Search...")

    # Test without search
    all_clients = Client.objects.all()[:5]
    print(f"Total clients in database: {Client.objects.count()}")

    if all_clients:
        print("First 5 clients:")
        for client in all_clients:
            print(f"  - {client.first_name} {client.last_name} ({client.email})")

    # Test with search
    search_term = "test"
    search_results = Client.objects.filter(
        Q(first_name__icontains=search_term)
        | Q(last_name__icontains=search_term)
        | Q(email__icontains=search_term)
        | Q(phone_number__icontains=search_term)
        | Q(address__icontains=search_term)
        | Q(notes__icontains=search_term)
    )

    print(f"\nSearch results for '{search_term}': {search_results.count()} found")
    for result in search_results[:5]:
        print(f"  - {result.first_name} {result.last_name} ({result.email})")


def test_service_search():
    """Test service search functionality"""
    print("\nTesting Service Search...")

    # Test without search
    all_services = Service.objects.all()[:5]
    print(f"Total services in database: {Service.objects.count()}")

    if all_services:
        print("First 5 services:")
        for service in all_services:
            print(f"  - {service.name}: {service.description}")

    # Test with search
    search_term = "massage"
    search_results = Service.objects.filter(
        Q(name__icontains=search_term)
        | Q(description__icontains=search_term)
        | Q(oil__icontains=search_term)
    )

    print(f"\nSearch results for '{search_term}': {search_results.count()} found")
    for result in search_results[:5]:
        print(f"  - {result.name}: {result.description}")


if __name__ == "__main__":
    try:
        test_client_search()
        test_service_search()
        print("\nBackend search functionality test completed successfully!")
    except Exception as e:
        print(f"Error testing search functionality: {e}")
        import traceback

        traceback.print_exc()
