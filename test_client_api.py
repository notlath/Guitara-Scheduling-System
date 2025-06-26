import requests
import json


def test_client_endpoint():
    """Test the client API endpoint"""

    base_url = "http://localhost:8000"
    endpoint = "/registration/register/client/"

    # Test the GET request
    try:
        response = requests.get(f"{base_url}{endpoint}?page=1&page_size=12")
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")

        if response.status_code == 200:
            data = response.json()
            print(f"Response Data: {json.dumps(data, indent=2)}")

            # Check if it has the expected structure
            if "results" in data:
                print(f"✅ Found {len(data['results'])} clients")
                print(f"Total count: {data.get('count', 'N/A')}")
                print(f"Total pages: {data.get('total_pages', 'N/A')}")

                for i, client in enumerate(data["results"][:3]):  # Show first 3
                    print(f"  Client {i+1}: {client}")
            else:
                print("❌ Unexpected response structure")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")

    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to Django server. Is it running on port 8000?")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    test_client_endpoint()
