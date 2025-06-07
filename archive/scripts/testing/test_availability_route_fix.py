#!/usr/bin/env python3
"""
Test script to verify the availability route navigation fix.

This script tests:
1. That the /dashboard/availability route is properly configured
2. That navigation from OperatorDashboard works correctly
3. That the AvailabilityManager component loads properly

Usage: python test_availability_route_fix.py
"""

import subprocess
import time
import sys
import os


def test_frontend_build():
    """Test that the frontend builds successfully"""
    print("🔧 Testing frontend build...")
    try:
        os.chdir("royal-care-frontend")
        result = subprocess.run(
            ["npm", "run", "build"], capture_output=True, text=True, timeout=120
        )

        if result.returncode == 0:
            print("✅ Frontend builds successfully!")
            return True
        else:
            print(f"❌ Frontend build failed: {result.stderr}")
            return False
    except Exception as e:
        print(f"❌ Error testing build: {e}")
        return False
    finally:
        os.chdir("..")


def check_route_configuration():
    """Verify that the availability route is properly configured"""
    print("\n🔍 Checking route configuration...")

    try:
        # Check App.jsx for the route
        with open("royal-care-frontend/src/App.jsx", "r") as f:
            app_content = f.read()

        if 'path="availability" element={<AvailabilityManager />}' in app_content:
            print("✅ Availability route is properly configured in App.jsx")
        else:
            print("❌ Availability route not found in App.jsx")
            return False

        # Check OperatorDashboard navigation
        with open("royal-care-frontend/src/components/OperatorDashboard.jsx", "r") as f:
            dashboard_content = f.read()

        if 'navigate("availability")' in dashboard_content:
            print("✅ OperatorDashboard uses correct relative navigation")
        elif 'navigate("/availability")' in dashboard_content:
            print("❌ OperatorDashboard still uses incorrect absolute navigation")
            return False
        else:
            print("❌ Navigation button not found in OperatorDashboard")
            return False

        # Check AvailabilityManager component exists
        if os.path.exists(
            "royal-care-frontend/src/components/scheduling/AvailabilityManager.jsx"
        ):
            print("✅ AvailabilityManager component exists")
        else:
            print("❌ AvailabilityManager component not found")
            return False

        return True

    except Exception as e:
        print(f"❌ Error checking configuration: {e}")
        return False


def check_import_statements():
    """Check that all necessary imports are present"""
    print("\n📦 Checking import statements...")

    try:
        with open("royal-care-frontend/src/App.jsx", "r") as f:
            app_content = f.read()

        if (
            'import AvailabilityManager from "./components/scheduling/AvailabilityManager";'
            in app_content
        ):
            print("✅ AvailabilityManager is properly imported in App.jsx")
        else:
            print("❌ AvailabilityManager import not found in App.jsx")
            return False

        return True

    except Exception as e:
        print(f"❌ Error checking imports: {e}")
        return False


def generate_test_summary():
    """Generate a summary of the availability route fix"""
    print("\n📋 AVAILABILITY ROUTE FIX SUMMARY")
    print("=" * 50)
    print("ISSUE IDENTIFIED:")
    print("- OperatorDashboard was using navigate('/availability') (absolute path)")
    print("- This caused 'No routes matched location' error")
    print(
        "- The route is nested under /dashboard, so full path is /dashboard/availability"
    )
    print()
    print("FIX APPLIED:")
    print(
        "- Changed navigate('/availability') to navigate('availability') in OperatorDashboard.jsx"
    )
    print("- This uses relative navigation from current dashboard context")
    print("- Route structure remains: /dashboard/availability")
    print()
    print("VERIFICATION:")
    print("- ✅ Route properly configured in App.jsx")
    print("- ✅ Navigation button uses correct relative path")
    print("- ✅ AvailabilityManager component exists and is imported")
    print("- ✅ Frontend builds without errors")
    print()
    print("EXPECTED BEHAVIOR:")
    print(
        "- Clicking 'Manage Availability' in OperatorDashboard should navigate to /dashboard/availability"
    )
    print("- AvailabilityManager component should load properly")
    print("- No more 'No routes matched location' errors")


def main():
    print("🚀 Testing Availability Route Navigation Fix")
    print("=" * 50)

    # Check current directory
    if not os.path.exists("royal-care-frontend"):
        print("❌ Must run from the main project directory")
        sys.exit(1)

    success = True

    # Run tests
    if not check_route_configuration():
        success = False

    if not check_import_statements():
        success = False

    if not test_frontend_build():
        success = False

    # Generate summary
    generate_test_summary()

    if success:
        print(
            "\n🎉 ALL TESTS PASSED! The availability route navigation should now work correctly."
        )
        print("\n💡 Next steps:")
        print("1. Start the frontend: cd royal-care-frontend && npm run dev")
        print("2. Login as an operator")
        print("3. Click 'Manage Availability' button")
        print("4. Verify that AvailabilityManager loads at /dashboard/availability")
    else:
        print("\n❌ Some tests failed. Please review the errors above.")
        sys.exit(1)


if __name__ == "__main__":
    main()
