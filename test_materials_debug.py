#!/usr/bin/env python3
"""
Debug the materials API 500 error
"""

import os
import sys
import django
import requests

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django environment
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), "guitara"))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()


def test_materials_api():
    """Test the materials API directly in Django"""
    print("=== Testing Materials API Debug ===")

    try:
        from registration.models import Service, RegistrationMaterial
        from registration.serializers import RegistrationMaterialSerializer

        # Check services
        services = Service.objects.all()[:5]
        print(f"Found {services.count()} services:")
        for service in services:
            print(f"  - {service.id}: {service.name}")

        # Pick service ID 2 (the one causing errors)
        service_id = 2
        print(f"\nTesting materials for service {service_id}:")

        # Check if service exists
        if not Service.objects.filter(id=service_id).exists():
            print(f"❌ Service {service_id} does not exist")
            return

        # Get materials
        materials = RegistrationMaterial.objects.filter(service_id=service_id)
        print(f"Found {materials.count()} materials for service {service_id}")

        if materials.exists():
            print("Materials found:")
            for mat in materials:
                print(f"  - {mat.id}: {mat.name}")
                print(f"    Stock: {mat.stock_quantity}")
                print(f"    Has inventory_item: {bool(mat.inventory_item)}")
                if mat.inventory_item:
                    try:
                        print(
                            f"    Inventory stock: {mat.inventory_item.current_stock}"
                        )
                    except Exception as e:
                        print(f"    ❌ Error accessing inventory_item: {e}")

            # Test serializer
            print("\nTesting serializer:")
            try:
                serializer = RegistrationMaterialSerializer(materials, many=True)
                data = serializer.data
                print(f"✅ Serializer successful, {len(data)} items")
                for item in data[:2]:  # Show first 2
                    print(f"  - {item.get('name')}: stock={item.get('current_stock')}")
            except Exception as e:
                print(f"❌ Serializer error: {e}")
                import traceback

                traceback.print_exc()
        else:
            print("No materials found for this service")

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()


def test_api_endpoint():
    """Test the actual HTTP API endpoint"""
    print("\n=== Testing HTTP API Endpoint ===")

    try:
        # Test without auth first
        response = requests.get(
            "http://localhost:8000/api/registration/materials-with-stock/2/", timeout=10
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}")

    except requests.exceptions.ConnectionError:
        print("❌ Backend server not running")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    test_materials_api()
    test_api_endpoint()
