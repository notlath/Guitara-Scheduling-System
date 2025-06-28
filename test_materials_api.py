#!/usr/bin/env python3
"""
Test materials API endpoints to debug the "No required materials" issue
"""

import requests
import os
import django
import sys

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()


# Get token from backend for authentication
def get_auth_token():
    """Get authentication token for API calls"""
    try:
        from django.contrib.auth.models import User
        from rest_framework.authtoken.models import Token

        # Try to get an existing user/token
        user = User.objects.filter(is_staff=True).first()
        if user:
            token, _ = Token.objects.get_or_create(user=user)
            return token.key

        print("No staff user found. Creating test user...")
        # Create a test user if none exist
        user = User.objects.create_user("testuser", "test@example.com", "testpass123")
        user.is_staff = True
        user.save()

        token, _ = Token.objects.get_or_create(user=user)
        return token.key

    except Exception as e:
        print(f"Error getting token: {e}")
        return None


def test_materials_api():
    """Test the materials API endpoints"""
    base_url = "http://localhost:8000/api"

    # Get authentication token
    token = get_auth_token()
    if not token:
        print("❌ Could not get authentication token")
        return

    headers = {"Authorization": f"Token {token}", "Content-Type": "application/json"}

    print("=== Testing Materials API ===")
    print(f"Using token: {token[:10]}...")

    # 1. Test services endpoint first
    print("\n1. Getting available services:")
    try:
        response = requests.get(f"{base_url}/scheduling/services/", headers=headers)
        print(f"Services endpoint status: {response.status_code}")

        if response.status_code == 200:
            services = response.json()
            print(f"Found {len(services)} services:")
            for service in services[:3]:  # Show first 3
                print(f"  - ID: {service.get('id')}, Name: {service.get('name')}")

            if services:
                service_id = services[0]["id"]
                print(f"\nUsing service ID {service_id} for materials testing...")

                # 2. Test materials endpoint
                print(f"\n2. Testing materials endpoint for service {service_id}:")
                materials_url = (
                    f"{base_url}/registration/materials-with-stock/{service_id}/"
                )
                print(f"URL: {materials_url}")

                materials_response = requests.get(materials_url, headers=headers)
                print(f"Materials endpoint status: {materials_response.status_code}")

                if materials_response.status_code == 200:
                    materials_data = materials_response.json()
                    print(f"Materials data type: {type(materials_data)}")
                    print(
                        f"Materials data length: {len(materials_data) if isinstance(materials_data, list) else 'N/A'}"
                    )
                    print(f"Materials data: {materials_data}")

                    if isinstance(materials_data, list) and len(materials_data) > 0:
                        print("✅ Materials found!")
                        for mat in materials_data[:2]:  # Show first 2
                            print(f"  - Material: {mat}")
                    else:
                        print("⚠️ No materials returned (empty array)")

                        # Check if there are any materials in the database
                        print("\n3. Checking database for materials:")
                        from apps.inventory.models import Material

                        all_materials = Material.objects.all()[:5]
                        print(
                            f"Total materials in database: {Material.objects.count()}"
                        )
                        for mat in all_materials:
                            print(f"  - {mat.name} (ID: {mat.id})")

                        # Check if there are service-material relationships
                        print("\n4. Checking service-material relationships:")
                        from apps.registration.models import Service

                        try:
                            service_obj = Service.objects.get(id=service_id)
                            if hasattr(service_obj, "materials"):
                                related_materials = service_obj.materials.all()
                                print(
                                    f"Service '{service_obj.name}' has {len(related_materials)} related materials"
                                )
                                for mat in related_materials:
                                    print(f"  - {mat.name}")
                            else:
                                print(f"Service model doesn't have 'materials' field")
                                # Check available fields
                                print(
                                    f"Service fields: {[f.name for f in service_obj._meta.get_fields()]}"
                                )
                        except Exception as e:
                            print(f"Error checking service relationships: {e}")

                else:
                    print(
                        f"❌ Materials endpoint error: {materials_response.status_code}"
                    )
                    print(f"Response: {materials_response.text}")
            else:
                print("❌ No services found")
        else:
            print(f"❌ Services endpoint error: {response.status_code}")
            print(f"Response: {response.text}")

    except Exception as e:
        print(f"❌ Error testing materials API: {e}")


if __name__ == "__main__":
    test_materials_api()
