#!/usr/bin/env python3
"""
Royal Care Scheduling System - Quick Status Check
Verifies the complete implementation is working correctly
"""

import requests
import json
import sys
import os


def check_backend():
    """Check if backend is running and healthy"""
    try:
        response = requests.get("http://127.0.0.1:8000/api/", timeout=5)
        if response.status_code == 200:
            print("✅ Backend server is running (http://127.0.0.1:8000)")
            return True
        else:
            print(f"⚠️ Backend server responding with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Backend server not accessible")
        print("   Start with: cd guitara && python manage.py runserver")
        return False
    except Exception as e:
        print(f"❌ Backend check failed: {e}")
        return False


def check_frontend():
    """Check if frontend is running"""
    try:
        response = requests.get("http://127.0.0.1:5173", timeout=5)
        if response.status_code == 200:
            print("✅ Frontend server is running (http://127.0.0.1:5173)")
            return True
        else:
            print(f"⚠️ Frontend server responding with status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Frontend server not accessible")
        print("   Start with: cd royal-care-frontend && npm run dev")
        return False
    except Exception as e:
        print(f"❌ Frontend check failed: {e}")
        return False


def check_database():
    """Check database connectivity"""
    try:
        response = requests.get("http://127.0.0.1:8000/api/appointments/", timeout=5)
        if response.status_code in [200, 401]:  # 401 is expected without auth
            print("✅ Database connectivity confirmed")
            return True
        else:
            print(f"⚠️ Database check returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Database check failed: {e}")
        return False


def check_files():
    """Check if key implementation files exist"""
    files_to_check = [
        "guitara/scheduling/models.py",
        "guitara/scheduling/views.py",
        "royal-care-frontend/src/components/OperatorDashboard.jsx",
        "royal-care-frontend/src/components/TherapistDashboard.jsx",
        "royal-care-frontend/src/components/DriverDashboard.jsx",
        "royal-care-frontend/src/features/scheduling/schedulingSlice.js",
    ]

    print("\n📋 Checking implementation files...")
    all_exist = True

    for file_path in files_to_check:
        if os.path.exists(file_path):
            print(f"✅ {file_path}")
        else:
            print(f"❌ {file_path}")
            all_exist = False

    return all_exist


def main():
    """Main status check function"""
    print("🏠 Royal Care Scheduling System - Status Check")
    print("=" * 55)

    # Check implementation files
    files_ok = check_files()

    print("\n🌐 Checking development servers...")
    backend_ok = check_backend()
    frontend_ok = check_frontend()

    if backend_ok:
        print("\n🗄️ Checking database...")
        db_ok = check_database()
    else:
        db_ok = False

    print("\n📊 Status Summary:")
    print(f"   Implementation Files: {'✅ Ready' if files_ok else '❌ Missing'}")
    print(f"   Backend Server: {'✅ Running' if backend_ok else '❌ Stopped'}")
    print(f"   Frontend Server: {'✅ Running' if frontend_ok else '❌ Stopped'}")
    print(f"   Database: {'✅ Connected' if db_ok else '❌ Disconnected'}")

    if all([files_ok, backend_ok, frontend_ok, db_ok]):
        print("\n🎉 System Status: READY FOR TESTING!")
        print("\n🚀 Next Steps:")
        print("1. Run test script: python test_complete_workflow.py")
        print("2. Open frontend: http://127.0.0.1:5173")
        print("3. Test the complete service workflow")
    else:
        print("\n⚠️ System Status: NEEDS ATTENTION")
        if not files_ok:
            print("   → Check file paths and implementation")
        if not backend_ok:
            print("   → Start backend: cd guitara && python manage.py runserver")
        if not frontend_ok:
            print("   → Start frontend: cd royal-care-frontend && npm run dev")
        if not db_ok and backend_ok:
            print("   → Run migrations: cd guitara && python manage.py migrate")


if __name__ == "__main__":
    main()
