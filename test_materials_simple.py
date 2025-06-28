#!/usr/bin/env python3
"""
Simple test for materials API without Django setup
"""

import requests
import json


def test_materials_simple():
    """Test materials API using hardcoded token"""
    base_url = "http://localhost:8000/api"

    # Try with no auth first to see if it's an auth issue
    print("=== Testing Materials API (Simple) ===")

    # 1. Test services endpoint first (likely works without auth)
    print("\n1. Testing services endpoint (no auth):")
    try:
        response = requests.get(f"{base_url}/scheduling/services/")
        print(f"Services endpoint status: {response.status_code}")
        print(f"Response: {response.text[:200]}...")

        if response.status_code == 200:
            services = response.json()
            print(f"Found {len(services)} services")

            if services:
                service_id = services[0]["id"]
                service_name = services[0].get("name", "Unknown")
                print(f"Using service: {service_name} (ID: {service_id})")

                # 2. Test materials endpoint without auth
                print(f"\n2. Testing materials endpoint (no auth):")
                materials_url = (
                    f"{base_url}/registration/materials-with-stock/{service_id}/"
                )
                print(f"URL: {materials_url}")

                materials_response = requests.get(materials_url)
                print(f"Status: {materials_response.status_code}")
                print(f"Response: {materials_response.text}")

                # 3. Try with fake token
                print(f"\n3. Testing materials endpoint (with token):")
                headers = {"Authorization": "Token abc123"}
                materials_response_auth = requests.get(materials_url, headers=headers)
                print(f"Status with token: {materials_response_auth.status_code}")
                print(f"Response with token: {materials_response_auth.text}")

        else:
            print("❌ Services endpoint failed")

    except Exception as e:
        print(f"❌ Error: {e}")


def check_backend_materials():
    """Check if materials exist in the database directly"""
    print("\n=== Checking Backend Materials ===")

    # Test if we can access the Django shell
    import subprocess

    try:
        # Try to run a simple Django shell command
        cmd = [
            "python",
            "manage.py",
            "shell",
            "-c",
            'from apps.inventory.models import Material; print(f"Materials in DB: {Material.objects.count()}")',
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        print(f"Django shell output: {result.stdout}")
        if result.stderr:
            print(f"Django shell errors: {result.stderr}")
    except Exception as e:
        print(f"Could not run Django shell: {e}")


if __name__ == "__main__":
    test_materials_simple()
    check_backend_materials()
