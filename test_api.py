import requests
import json


def test_login():
    print("Testing login endpoint...")

    url = "http://localhost:8000/api/auth/login/"
    data = {"username": "testuser", "password": "testpass123"}

    try:
        response = requests.post(url, json=data)
        print(f"Status Code: {response.status_code}")
        print(f"Response Headers: {dict(response.headers)}")
        print(f"Response Text: {response.text}")

        if response.status_code == 200:
            try:
                json_data = response.json()
                print(f"JSON Response: {json_data}")
                if "token" in json_data:
                    print(f"✅ Token received: {json_data['token'][:20]}...")
                else:
                    print("❌ No token in response")
            except json.JSONDecodeError:
                print("❌ Response is not valid JSON")
        else:
            print(f"❌ Login failed with status {response.status_code}")

    except Exception as e:
        print(f"❌ Request failed: {e}")


def test_appointments():
    print("\nTesting appointments endpoint...")

    # First login to get token
    login_url = "http://localhost:8000/api/auth/login/"
    login_data = {"username": "testuser", "password": "testpass123"}

    try:
        login_response = requests.post(login_url, json=login_data)
        if login_response.status_code == 200:
            token_data = login_response.json()
            token = token_data.get("token")

            if token:
                # Test appointments endpoint
                appointments_url = "http://localhost:8000/api/scheduling/appointments/"
                headers = {
                    "Authorization": f"Token {token}",
                    "Content-Type": "application/json",
                }

                appointments_response = requests.get(appointments_url, headers=headers)
                print(f"Appointments Status: {appointments_response.status_code}")
                print(f"Appointments Response: {appointments_response.text[:200]}")
            else:
                print("❌ No token received from login")
        else:
            print(f"❌ Login failed: {login_response.status_code}")

    except Exception as e:
        print(f"❌ Appointments test failed: {e}")


if __name__ == "__main__":
    test_login()
    test_appointments()
