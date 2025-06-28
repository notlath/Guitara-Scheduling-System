#!/usr/bin/env python3
"""
Simple test to check materials API after fix
"""

import requests
import json


def test_materials_endpoint():
    """Test the materials API endpoint"""
    print("=== Testing Materials API Fix ===")

    base_url = "http://localhost:8000/api"

    # Test services endpoint first
    try:
        print("1. Testing services endpoint...")
        response = requests.get(
            f"{base_url}/registration/register/service/", timeout=10
        )
        print(f"   Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            services = data.get("results", [])
            print(f"   Found {len(services)} services")

            # Test first few services for materials
            for i, service in enumerate(services[:3]):
                service_id = service.get("id")
                service_name = service.get("name", "Unknown")
                print(
                    f"\n2.{i+1} Testing materials for service {service_id}: {service_name}"
                )

                try:
                    materials_response = requests.get(
                        f"{base_url}/registration/materials-with-stock/{service_id}/",
                        timeout=10,
                    )
                    print(f"     Status: {materials_response.status_code}")

                    if materials_response.status_code == 200:
                        materials_data = materials_response.json()
                        results = materials_data.get("results", [])
                        print(f"     ✅ Materials: {len(results)} items")

                        if results:
                            print(
                                f"     First material: {results[0].get('name', 'Unknown')}"
                            )
                        else:
                            print(
                                f"     Message: {materials_data.get('message', 'No message')}"
                            )
                    else:
                        print(f"     ❌ Error: {materials_response.text[:200]}")

                except requests.exceptions.Timeout:
                    print(f"     ⏰ Timeout for service {service_id}")
                except Exception as e:
                    print(f"     ❌ Exception: {e}")
        else:
            print(f"   ❌ Services endpoint failed: {response.text[:200]}")

    except requests.exceptions.ConnectionError:
        print("❌ Backend server not running on localhost:8000")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    test_materials_endpoint()
