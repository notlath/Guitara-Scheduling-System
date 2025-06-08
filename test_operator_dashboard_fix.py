#!/usr/bin/env python3
"""
Test script to verify OperatorDashboard.jsx fixes for staffMembers reference error
"""

import os
import sys
import subprocess
import time


def run_command(cmd, cwd=None, timeout=30):
    """Run a command and return the result"""
    try:
        result = subprocess.run(
            cmd, shell=True, cwd=cwd, capture_output=True, text=True, timeout=timeout
        )
        return result.returncode == 0, result.stdout, result.stderr
    except subprocess.TimeoutExpired:
        return False, "", "Command timed out"
    except Exception as e:
        return False, "", str(e)


def test_frontend_build():
    """Test if frontend builds without errors"""
    print("🏗️  Testing frontend build...")

    frontend_dir = os.path.join(os.getcwd(), "royal-care-frontend")
    if not os.path.exists(frontend_dir):
        print("❌ Frontend directory not found")
        return False

    success, stdout, stderr = run_command("npm run build", cwd=frontend_dir)

    if success:
        print("✅ Frontend build successful")
        return True
    else:
        print("❌ Frontend build failed")
        print("STDOUT:", stdout)
        print("STDERR:", stderr)
        return False


def check_operator_dashboard_fixes():
    """Check if OperatorDashboard.jsx has the required fixes"""
    print("🔍 Checking OperatorDashboard.jsx fixes...")

    dashboard_path = os.path.join(
        os.getcwd(), "royal-care-frontend", "src", "components", "OperatorDashboard.jsx"
    )

    if not os.path.exists(dashboard_path):
        print("❌ OperatorDashboard.jsx not found")
        return False

    with open(dashboard_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Check for memoized staffMembers
    has_memoized_drivers = "const availableDrivers = useMemo(" in content
    has_useSelector_staffMembers = (
        "const { appointments, notifications, staffMembers, loading, error } = useSelector("
        in content
    )
    has_callback_function = "const getAvailableDrivers = useCallback(" in content
    has_memoized_pickup = "const pickupRequests = useMemo(" in content

    print(f"✅ Memoized availableDrivers: {has_memoized_drivers}")
    print(f"✅ useSelector includes staffMembers: {has_useSelector_staffMembers}")
    print(f"✅ getAvailableDrivers as useCallback: {has_callback_function}")
    print(f"✅ Memoized pickupRequests: {has_memoized_pickup}")

    if all(
        [
            has_memoized_drivers,
            has_useSelector_staffMembers,
            has_callback_function,
            has_memoized_pickup,
        ]
    ):
        print("✅ All OperatorDashboard.jsx fixes are in place")
        return True
    else:
        print("❌ Some fixes are missing in OperatorDashboard.jsx")
        return False


def check_scheduling_slice():
    """Check if schedulingSlice.js has all required exports"""
    print("🔍 Checking schedulingSlice.js exports...")

    slice_path = os.path.join(
        os.getcwd(),
        "royal-care-frontend",
        "src",
        "features",
        "scheduling",
        "schedulingSlice.js",
    )

    if not os.path.exists(slice_path):
        print("❌ schedulingSlice.js not found")
        return False

    with open(slice_path, "r", encoding="utf-8") as f:
        content = f.read()

    required_exports = [
        "fetchStaffMembers",
        "fetchAppointments",
        "fetchNotifications",
        "assignDriverToPickup",
        "autoCancelOverdueAppointments",
        "reviewRejection",
    ]

    missing_exports = []
    for export in required_exports:
        if f"export {{ {export}" not in content and f"{export}," not in content:
            missing_exports.append(export)

    if missing_exports:
        print(f"❌ Missing exports: {missing_exports}")
        return False
    else:
        print("✅ All required exports found in schedulingSlice.js")
        return True


def main():
    """Main test function"""
    print("🧪 Testing OperatorDashboard.jsx staffMembers fix")
    print("=" * 50)

    # Change to the project directory
    project_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(project_dir)

    all_tests_passed = True

    # Run tests
    tests = [
        ("Frontend Build Test", test_frontend_build),
        ("OperatorDashboard Fixes Check", check_operator_dashboard_fixes),
        ("SchedulingSlice Exports Check", check_scheduling_slice),
    ]

    for test_name, test_func in tests:
        print(f"\n🔬 Running {test_name}...")
        try:
            result = test_func()
            if not result:
                all_tests_passed = False
        except Exception as e:
            print(f"❌ {test_name} failed with error: {e}")
            all_tests_passed = False

    print("\n" + "=" * 50)
    if all_tests_passed:
        print(
            "🎉 All tests passed! OperatorDashboard.jsx should now work without runtime errors."
        )
        print("\n📋 Next steps:")
        print("1. Start the frontend dev server: npm run dev")
        print("2. Start the backend server: python manage.py runserver")
        print("3. Navigate to the operator dashboard in browser")
        print("4. Verify no 'staffMembers is not defined' error occurs")
    else:
        print("❌ Some tests failed. Please review the output above.")

    return all_tests_passed


if __name__ == "__main__":
    sys.exit(0 if main() else 1)
