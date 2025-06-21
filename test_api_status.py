#!/usr/bin/env python3
"""
Quick API Status Test - Check if both frontend and backend are running
"""

import requests
import time
import sys


def test_backend():
    """Test Django backend connectivity"""
    try:
        response = requests.get("http://localhost:8000/api/appointments/", timeout=5)
        print(f"✅ Backend API: HTTP {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            count = (
                len(data.get("results", [])) if isinstance(data, dict) else len(data)
            )
            print(f"   📊 Appointments: {count} found")
            return True
        return False
    except requests.exceptions.ConnectionError:
        print("❌ Backend API: Connection refused (server not running)")
        return False
    except Exception as e:
        print(f"❌ Backend API: Error - {e}")
        return False


def test_frontend():
    """Test React frontend"""
    try:
        response = requests.get("http://localhost:3000", timeout=5)
        print(f"✅ Frontend: HTTP {response.status_code}")
        return response.status_code == 200
    except requests.exceptions.ConnectionError:
        print("❌ Frontend: Connection refused (server not running)")
        return False
    except Exception as e:
        print(f"❌ Frontend: Error - {e}")
        return False


def main():
    print("🔍 Testing API Status...")
    print("-" * 40)

    backend_ok = test_backend()
    frontend_ok = test_frontend()

    print("-" * 40)
    if backend_ok and frontend_ok:
        print("🎉 Both servers are running!")
        print("🌐 Open http://localhost:3000 to access the app")
    elif backend_ok:
        print("⚠️  Backend OK, but frontend needs to be started")
        print("   Run: npm run dev")
    elif frontend_ok:
        print("⚠️  Frontend OK, but backend needs to be started")
        print("   Run: python guitara/manage.py runserver")
    else:
        print("🚨 Both servers need to be started")
        print("   Backend: python guitara/manage.py runserver")
        print("   Frontend: npm run dev")


if __name__ == "__main__":
    main()
