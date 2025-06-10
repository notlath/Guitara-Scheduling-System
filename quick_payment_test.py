#!/usr/bin/env python3
"""
Quick test to verify the payment workflow endpoint specifically
"""

import requests
import json


# Test the specific payment endpoint
def test_payment_endpoint_directly():
    print("🧪 Testing Payment Endpoint Directly")
    print("=" * 40)

    # Test the correct endpoint path
    try:
        # We expect this to fail with 404 for non-existent appointment or 403/401 for auth
        # But NOT with 500 server error or endpoint not found
        response = requests.post(
            "http://localhost:8000/api/scheduling/appointments/999/mark-awaiting-payment/"
        )
        print(f"✅ Endpoint exists - Status Code: {response.status_code}")
        print(f"Response: {response.text[:200]}...")

        if response.status_code == 404:
            try:
                error_data = response.json()
                if "detail" in error_data and "Not found" in error_data["detail"]:
                    print(
                        "✅ Correct 404 - Appointment not found (expected for ID 999)"
                    )
                else:
                    print("⚠️ Different 404 response:", error_data)
            except:
                print("⚠️ 404 but couldn't parse response")

        elif response.status_code in [401, 403]:
            print("✅ Authentication/Permission error (expected without auth token)")

        elif response.status_code == 500:
            print("❌ Server error - there may be a backend issue")

        else:
            print(f"⚠️ Unexpected status code: {response.status_code}")

    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend server")
        return False
    except Exception as e:
        print(f"❌ Error testing endpoint: {e}")
        return False

    return True


if __name__ == "__main__":
    test_payment_endpoint_directly()

    print("\n" + "=" * 50)
    print("🔄 NEXT STEPS:")
    print("1. Open http://localhost:5173/ in your browser")
    print("2. Open Developer Tools (F12)")
    print("3. Go to Network tab")
    print("4. Clear cache (Ctrl+Shift+R or Cmd+Shift+R)")
    print("5. Login and try 'Request Payment' on an appointment")
    print("6. Check Network tab - URL should be mark-awaiting-payment")
    print("7. If still shows request_payment, clear browser cache again")
    print("=" * 50)
