#!/usr/bin/env python
"""
Test the fixed API endpoints
"""
import requests
import json


def test_client_api():
    """Test the client API endpoint"""
    print("🔍 Testing Client API...")

    try:
        # Test without authentication first
        response = requests.get("http://localhost:3000", timeout=5)
        print(f"Frontend server: {response.status_code}")
    except:
        print("❌ Frontend server not running")

    try:
        # Test backend client endpoint
        response = requests.get(
            "http://localhost:8000/api/registration/register/client/", timeout=5
        )
        print(f"Backend client API: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"Response type: {type(data)}")

            if isinstance(data, dict) and "results" in data:
                clients = data["results"]
                print(f"Found {len(clients)} clients")

                # Check if clients have ID field
                if clients:
                    first_client = clients[0]
                    print(f"First client fields: {list(first_client.keys())}")

                    # Check for Jess
                    jess_clients = [
                        c for c in clients if "jess" in c.get("first_name", "").lower()
                    ]
                    print(f"Clients with 'Jess' in first name: {len(jess_clients)}")
                    for client in jess_clients:
                        print(
                            f"  - {client.get('first_name')} {client.get('last_name')}"
                        )
                else:
                    print("⚠️ No clients found in response")
            else:
                print(f"Unexpected response format: {data}")
        else:
            print(f"API returned {response.status_code}: {response.text[:200]}")

    except requests.exceptions.ConnectionError:
        print("❌ Backend server not running")
    except Exception as e:
        print(f"❌ Error: {e}")


def test_materials_api():
    """Test the materials API endpoint"""
    print("\n🛠️ Testing Materials API...")

    try:
        # Test service endpoint first
        response = requests.get(
            "http://localhost:8000/api/registration/register/service/", timeout=5
        )

        if response.status_code == 200:
            data = response.json()
            services = data.get("results", [])
            print(f"Found {len(services)} services")

            if services:
                service = services[0]
                service_id = service.get("id")
                print(
                    f"Testing materials for service {service_id}: {service.get('name')}"
                )

                # Test materials endpoint
                materials_response = requests.get(
                    f"http://localhost:8000/api/registration/materials-with-stock/{service_id}/",
                    timeout=5,
                )

                print(f"Materials API: {materials_response.status_code}")
                if materials_response.status_code == 200:
                    materials_data = materials_response.json()
                    print(f"Materials response: {json.dumps(materials_data, indent=2)}")
                else:
                    print(f"Materials error: {materials_response.text}")
            else:
                print("⚠️ No services found")
        else:
            print(f"Services API returned {response.status_code}")

    except requests.exceptions.ConnectionError:
        print("❌ Backend server not running")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    print("🚀 Testing fixed API endpoints...")
    test_client_api()
    test_materials_api()
    print("\n✅ Testing completed!")
