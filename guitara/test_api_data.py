import requests
import json

# Test login
login_data = {"username": "operator1", "password": "operator123"}

try:
    # Test authentication
    print("Testing authentication...")
    response = requests.post(
        "http://localhost:8000/api/auth/login/",
        json=login_data,
        headers={"Content-Type": "application/json"},
    )
    print(f"Login response status: {response.status_code}")

    if response.status_code == 200:
        token_data = response.json()
        print(f"✓ Login successful! Token received.")
        token = token_data.get("token")

        # Test data endpoints with authentication
        headers = {
            "Authorization": f"Token {token}",
            "Content-Type": "application/json",
        }

        # Test therapists endpoint
        print("\nTesting therapists endpoint...")
        response = requests.get(
            "http://localhost:8000/api/registration/therapists/", headers=headers
        )
        print(f"Therapists response status: {response.status_code}")
        if response.status_code == 200:
            therapists = response.json()
            print(f"✓ Found {len(therapists)} therapists")
            for t in therapists[:3]:  # Show first 3
                print(
                    f"  - {t.get('first_name', 'N/A')} {t.get('last_name', 'N/A')} ({t.get('specialization', 'N/A')})"
                )

        # Test drivers endpoint
        print("\nTesting drivers endpoint...")
        response = requests.get(
            "http://localhost:8000/api/registration/drivers/", headers=headers
        )
        print(f"Drivers response status: {response.status_code}")
        if response.status_code == 200:
            drivers = response.json()
            print(f"✓ Found {len(drivers)} drivers")
            for d in drivers[:3]:  # Show first 3
                print(f"  - {d.get('first_name', 'N/A')} {d.get('last_name', 'N/A')}")

        # Test services endpoint
        print("\nTesting services endpoint...")
        response = requests.get(
            "http://localhost:8000/api/registration/services/", headers=headers
        )
        print(f"Services response status: {response.status_code}")
        if response.status_code == 200:
            services = response.json()
            print(f"✓ Found {len(services)} services")
            for s in services[:3]:  # Show first 3
                print(f"  - {s.get('name', 'N/A')} - ₱{s.get('price', 'N/A')}")

        # Test materials endpoint
        print("\nTesting materials endpoint...")
        response = requests.get(
            "http://localhost:8000/api/registration/materials/", headers=headers
        )
        print(f"Materials response status: {response.status_code}")
        if response.status_code == 200:
            materials = response.json()
            print(f"✓ Found {len(materials)} materials")
            for m in materials[:3]:  # Show first 3
                print(f"  - {m.get('name', 'N/A')} ({m.get('category', 'N/A')})")

    else:
        print(f"❌ Login failed: {response.text}")

except requests.exceptions.ConnectionError:
    print(
        "❌ Could not connect to server. Make sure Django server is running on port 8000."
    )
except Exception as e:
    print(f"❌ Error: {e}")
