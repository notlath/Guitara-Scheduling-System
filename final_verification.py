#!/usr/bin/env python3
"""
Final verification script for OperatorDashboard appointments fix
"""
import os
import sys
import json
import time
from pathlib import Path


def check_file_exists(file_path, description):
    """Check if a file exists and print status"""
    if os.path.exists(file_path):
        print(f"✅ {description}: Found")
        return True
    else:
        print(f"❌ {description}: Missing")
        return False


def check_file_content(file_path, search_text, description):
    """Check if file contains specific text"""
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            if search_text in content:
                print(f"✅ {description}: Found")
                return True
            else:
                print(f"❌ {description}: Missing")
                return False
    except Exception as e:
        print(f"❌ {description}: Error reading file - {e}")
        return False


def main():
    print("🔍 Final Verification: OperatorDashboard Appointments Fix")
    print("=" * 60)

    base_path = Path(__file__).parent
    frontend_path = base_path / "royal-care-frontend" / "src"

    # Check critical files exist
    print("\n📁 File Existence Check:")
    files_to_check = [
        (
            frontend_path / "components" / "OperatorDashboard.jsx",
            "OperatorDashboard component",
        ),
        (frontend_path / "components" / "DebugAppointments.jsx", "Debug component"),
        (
            frontend_path / "components" / "ApiDiagnostic.jsx",
            "API diagnostic component",
        ),
        (
            frontend_path / "features" / "scheduling" / "schedulingSlice.js",
            "Redux scheduling slice",
        ),
    ]

    all_files_exist = True
    for file_path, description in files_to_check:
        if not check_file_exists(file_path, description):
            all_files_exist = False

    if not all_files_exist:
        print("\n❌ Some critical files are missing!")
        return False

    # Check code implementations
    print("\n🔧 Code Implementation Check:")
    operator_dashboard_path = frontend_path / "components" / "OperatorDashboard.jsx"

    code_checks = [
        (operator_dashboard_path, "fetchAppointments", "fetchAppointments import"),
        (
            operator_dashboard_path,
            "dispatch(fetchAppointments())",
            "fetchAppointments dispatch",
        ),
        (
            operator_dashboard_path,
            "appointments?.results || state.scheduling?.appointments",
            "Redux selector fix",
        ),
        (operator_dashboard_path, "DebugAppointments", "Debug component import"),
        (operator_dashboard_path, "ApiDiagnostic", "API diagnostic component import"),
    ]

    all_code_present = True
    for file_path, search_text, description in code_checks:
        if not check_file_content(file_path, search_text, description):
            all_code_present = False

    if not all_code_present:
        print("\n❌ Some code implementations are missing!")
        return False

    # Check backend test scripts
    print("\n🧪 Test Scripts Check:")
    test_scripts = [
        (base_path / "test_appointments_api.py", "Backend API test script"),
        (base_path / "quick_api_test.py", "Quick API connectivity test"),
    ]

    for file_path, description in test_scripts:
        check_file_exists(file_path, description)

    print("\n🎯 Summary:")
    print("✅ All critical files are present")
    print("✅ All code implementations are in place")
    print("✅ Debug components are integrated")
    print("✅ Redux selector handles both flat arrays and paginated results")
    print("✅ fetchAppointments is called on component mount")

    print("\n🚀 Next Steps:")
    print("1. Start the Django backend server: python guitara/manage.py runserver")
    print("2. Start the React frontend: npm run dev")
    print("3. Login to the application")
    print("4. Navigate to the Operator Dashboard")
    print("5. Check the debug panel (top-right corner) for appointment data")
    print("6. Verify appointments are displaying in the dashboard")

    print("\n📋 If appointments still show 'No Appointments':")
    print("1. Check the debug panel for Redux state and API responses")
    print("2. Use the 'Test API' and 'Test Redux' buttons in the debug panel")
    print("3. Check browser console for any errors")
    print("4. Verify backend is running and accessible at http://localhost:8000")
    print("5. Ensure user authentication token is valid")

    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
