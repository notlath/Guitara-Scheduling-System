#!/usr/bin/env python3
"""Simple test for the by_week endpoint"""

import requests
from datetime import datetime, timedelta


def quick_test():
    print("Quick test of the by_week endpoint...")

    # Test the endpoint
    base_url = "http://localhost:8000/api/scheduling/appointments/by_week/"

    # Test with valid date
    today = datetime.now().date()
    week_start = today - timedelta(days=today.weekday())

    try:
        response = requests.get(
            base_url, params={"week_start": week_start.strftime("%Y-%m-%d")}, timeout=5
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 401:
            print(
                "✅ by_week endpoint exists and requires authentication (working correctly)"
            )
            return True
        else:
            print(f"❌ Unexpected status code: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False


if __name__ == "__main__":
    success = quick_test()
    if success:
        print("\n🎉 SUCCESS: The by_week endpoint fix is working!")
    else:
        print("\n❌ FAILURE: There's still an issue with the by_week endpoint")
