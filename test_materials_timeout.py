#!/usr/bin/env python3
"""
Test materials API with timeout
"""

import requests
import json
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


def test_with_timeout():
    # Configure session with timeout and retries
    session = requests.Session()

    # Set timeout and retry strategy
    retry_strategy = Retry(
        total=2,
        backoff_factor=1,
        status_forcelist=[429, 500, 502, 503, 504],
    )
    adapter = HTTPAdapter(max_retries=retry_strategy)
    session.mount("http://", adapter)

    print("=== Testing with timeout ===")

    try:
        # Test services endpoint with 5 second timeout
        print("Testing services endpoint...")
        response = session.get(
            "http://localhost:8000/api/scheduling/services/", timeout=5
        )
        print(f"Services status: {response.status_code}")

        if response.status_code == 200:
            services = response.json()
            print(f"Found {len(services)} services")

            if services:
                service_id = services[0]["id"]
                print(f"Testing materials for service ID: {service_id}")

                # Test materials endpoint
                materials_url = f"http://localhost:8000/api/registration/materials-with-stock/{service_id}/"
                print(f"Materials URL: {materials_url}")

                materials_response = session.get(materials_url, timeout=10)
                print(f"Materials status: {materials_response.status_code}")
                print(f"Materials response: {materials_response.text}")

                if materials_response.status_code == 404:
                    print(
                        "❌ Materials endpoint not found - checking alternative endpoints"
                    )

                    # Try alternative endpoints
                    alt_urls = [
                        f"http://localhost:8000/api/materials/service/{service_id}/",
                        f"http://localhost:8000/api/inventory/materials/{service_id}/",
                        f"http://localhost:8000/api/registration/materials/{service_id}/",
                    ]

                    for alt_url in alt_urls:
                        try:
                            alt_response = session.get(alt_url, timeout=5)
                            print(f"Alternative {alt_url}: {alt_response.status_code}")
                        except:
                            print(f"Alternative {alt_url}: timeout/error")

        else:
            print(f"Services endpoint failed: {response.status_code}")
            print(f"Response: {response.text}")

    except requests.exceptions.Timeout:
        print("❌ Request timed out")
    except requests.exceptions.ConnectionError:
        print("❌ Connection error - server might not be running")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    test_with_timeout()
