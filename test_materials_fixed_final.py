#!/usr/bin/env python
"""
Quick test to check if materials API is working after the serializer fix
"""

import requests
import time


def test_materials_api():
    print("🧪 Testing Materials API after serializer fix...")

    base_url = "http://localhost:8000/api"

    # Wait a moment for server to start
    print("⏳ Waiting for server...")
    time.sleep(3)

    try:
        # Test service 2 materials (the one that was failing)
        service_id = 2
        materials_url = f"{base_url}/registration/materials-with-stock/{service_id}/"

        print(f"📡 Testing: {materials_url}")
        response = requests.get(materials_url, timeout=10)

        print(f"📊 Status: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"✅ Success! Found {len(data.get('results', []))} materials")

            # Show first material to verify structure
            results = data.get("results", [])
            if results:
                first_material = results[0]
                print(f"📦 First material: {first_material.get('name', 'Unknown')}")
                print(f"📊 Stock: {first_material.get('current_stock', 0)}")
                print(f"🏷️ Category: {first_material.get('category', 'Unknown')}")

                # Check if we have the "No required materials" message
                if data.get("message"):
                    print(f"💬 Message: {data.get('message')}")
            else:
                print(f"💬 Message: {data.get('message', 'No materials')}")

        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text[:200]}...")

    except requests.exceptions.ConnectionError:
        print("❌ Server not running or not accessible")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    test_materials_api()
