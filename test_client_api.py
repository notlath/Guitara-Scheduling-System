#!/usr/bin/env python
"""
Test the client API endpoint directly to debug the search issue
"""
import requests
import json
import os
import sys
import django

# Add Django setup
try:
    sys.path.insert(
        0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "guitara")
    )
    os.chdir(os.path.join(os.path.dirname(os.path.abspath(__file__)), "guitara"))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
    django.setup()

    from django.contrib.auth.models import User
    from rest_framework.authtoken.models import Token

    def get_auth_token():
        user = User.objects.first()
        if user:
            token, created = Token.objects.get_or_create(user=user)
            return token.key
        return None

except Exception as e:
    print(f"⚠️ Django setup failed: {e}")

    def get_auth_token():
        return None


def test_client_endpoint():
    """Test the client API endpoint with and without authentication"""

    base_url = "http://localhost:8000"
    api_endpoint = "/api/registration/register/client/"

    print("🔍 Testing Client API Endpoint")
    print(f"📡 URL: {base_url}{api_endpoint}")

    # Get authentication token
    token = get_auth_token()
    headers = {}
    if token:
        headers["Authorization"] = f"Token {token}"
        print(f"🔑 Using authentication token: {token[:10]}...")
    else:
        print("⚠️ No authentication token available")

    # Test the GET request
    try:
        print(f"\n📡 Making GET request...")
        response = requests.get(
            f"{base_url}{api_endpoint}", headers=headers, timeout=10
        )
        print(f"📊 Status Code: {response.status_code}")
        print(f"📋 Response Headers: {dict(response.headers)}")

        if response.status_code == 200:
            data = response.json()
            print(f"✅ API Success!")

            # Check response structure
            if isinstance(data, dict):
                print(f"📦 Response structure: {list(data.keys())}")
                clients = data.get("results", data)
                pagination = {
                    "count": data.get("count"),
                    "next": data.get("next"),
                    "previous": data.get("previous"),
                }
                print(f"📊 Pagination: {pagination}")
            else:
                clients = data
                print(f"📦 Response is array with {len(clients)} items")

            print(f"✅ Found {len(clients)} clients")

            # Show first few clients
            print(f"\n📋 First 5 clients:")
            for i, client in enumerate(clients[:5]):
                name = f"{client.get('first_name', '')} {client.get('last_name', '')}"
                phone = client.get("phone_number", "")
                email = client.get("email", "")
                print(f"  {i+1}. {name.strip()} - {phone} - {email}")

            # Test search for "Jess"
            print(f"\n🔍 Searching for clients with 'Jess' in name:")
            jess_matches = []
            for client in clients:
                first_name = (client.get("first_name") or "").lower()
                last_name = (client.get("last_name") or "").lower()
                full_name = f"{first_name} {last_name}".strip()

                if "jess" in first_name or "jess" in last_name:
                    jess_matches.append(client)
                    name = (
                        f"{client.get('first_name', '')} {client.get('last_name', '')}"
                    )
                    phone = client.get("phone_number", "")
                    print(f"  ✅ MATCH: {name.strip()} - {phone}")

            if not jess_matches:
                print("  ❌ No 'Jess' matches found!")
                print(f"  🔍 Let's check what names we have:")
                for i, client in enumerate(clients[:10]):
                    fname = client.get("first_name", "NO_FIRST_NAME")
                    lname = client.get("last_name", "NO_LAST_NAME")
                    print(f"    {i+1}. '{fname}' '{lname}'")
            else:
                print(f"  ✅ Found {len(jess_matches)} matches for 'Jess'")

            # Test the LazyClientSearch filtering logic
            print(f"\n🧪 Testing LazyClientSearch filtering logic:")
            search_term = "jess"
            filtered_clients = []

            for client in clients:
                # Replicate the exact logic from LazyClientSearch
                firstName = (
                    client.get("first_name") or client.get("Name", "").split(" ")[0]
                    if client.get("Name")
                    else ""
                )
                lastName = (
                    client.get("last_name")
                    or " ".join(client.get("Name", "").split(" ")[1:])
                    if client.get("Name")
                    else ""
                )
                phone = client.get("phone_number") or client.get("Contact") or ""

                # Test different search conditions
                starts_with_first = firstName.lower().startswith(search_term.lower())
                starts_with_last = lastName.lower().startswith(search_term.lower())
                phone_match = phone.startswith(search_term)

                if starts_with_first or starts_with_last or phone_match:
                    filtered_clients.append(client)
                    name = f"{firstName} {lastName}".strip()
                    print(f"  ✅ FILTER MATCH: {name} - {phone}")
                    print(f"    🔍 firstName: '{firstName}', lastName: '{lastName}'")
                    print(
                        f"    🔍 starts_with_first: {starts_with_first}, starts_with_last: {starts_with_last}"
                    )

            if not filtered_clients:
                print(
                    f"  ❌ LazyClientSearch filter would return 0 results for '{search_term}'"
                )
                print(
                    f"  🔍 This explains why user sees 'No clients found matching \"Jess\"'"
                )
            else:
                print(
                    f"  ✅ LazyClientSearch filter would return {len(filtered_clients)} results"
                )

        elif response.status_code == 401:
            print("❌ Authentication required - trying without token")
            # Try without authentication
            response2 = requests.get(f"{base_url}{api_endpoint}", timeout=10)
            print(f"📊 Status Code (no auth): {response2.status_code}")
            if response2.status_code != 401:
                print(f"Response: {response2.text[:500]}...")
        else:
            print(f"❌ Error: {response.status_code}")
            print(f"Response: {response.text}")

    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to Django server. Is it running on port 8000?")
        print("💡 Try running: cd guitara && python manage.py runserver")
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    test_client_endpoint()
