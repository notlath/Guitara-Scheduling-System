#!/usr/bin/env python3
"""
Test script to check the actual structure of the notifications API response
"""
import requests
import json

# Test URL (adjust as needed)
BASE_URL = "http://localhost:8000/api"
# Test URL for production (adjust as needed)
PROD_URL = "https://charismatic-appreciation-production.up.railway.app/api"


def test_notifications_structure():
    print("🧪 Testing Notifications API Response Structure")
    print("=" * 50)

    # This would need a valid token - this is just for structure analysis
    # You would need to get a real token from the frontend localStorage
    token = "YOUR_TOKEN_HERE"  # Replace with actual token

    for name, url in [("Local", BASE_URL), ("Production", PROD_URL)]:
        print(f"\n📡 Testing {name}: {url}/scheduling/notifications/")
        try:
            response = requests.get(
                f"{url}/scheduling/notifications/",
                headers={
                    "Authorization": f"Token {token}",
                    "Content-Type": "application/json",
                },
                timeout=10,
            )

            print(f"Status: {response.status_code}")

            if response.status_code == 200:
                data = response.json()
                print("📋 Response Structure:")
                print(f"  Type: {type(data)}")

                if isinstance(data, dict):
                    print(f"  Keys: {list(data.keys())}")

                    # Check for pagination metadata
                    pagination_keys = [
                        "count",
                        "next",
                        "previous",
                        "results",
                        "total_pages",
                        "current_page",
                        "page_size",
                    ]
                    found_pagination = [key for key in pagination_keys if key in data]
                    if found_pagination:
                        print(f"  Pagination keys found: {found_pagination}")

                    # Check for data fields
                    data_keys = ["results", "notifications", "data"]
                    found_data = []
                    for key in data_keys:
                        if key in data:
                            value = data[key]
                            found_data.append(
                                f"{key}: {type(value)} (length: {len(value) if hasattr(value, '__len__') else 'N/A'})"
                            )
                    if found_data:
                        print(f"  Data fields: {found_data}")

                    # Sample structure
                    print(f"  Sample structure: {json.dumps(data, indent=2)[:500]}...")

                elif isinstance(data, list):
                    print(f"  Direct array with {len(data)} items")
                    if data:
                        print(
                            f"  Sample item keys: {list(data[0].keys()) if isinstance(data[0], dict) else 'Not a dict'}"
                        )
            else:
                print(f"❌ Error: {response.status_code}")
                print(f"Response: {response.text[:200]}...")

        except Exception as e:
            print(f"❌ Exception: {e}")


if __name__ == "__main__":
    test_notifications_structure()
    print("\n" + "=" * 50)
    print("💡 To run this test with a real token:")
    print("1. Open browser dev tools on the frontend")
    print("2. Go to Application/Storage > Local Storage")
    print("3. Copy the 'knoxToken' value")
    print("4. Replace 'YOUR_TOKEN_HERE' in this script")
    print("5. Run the script again")
