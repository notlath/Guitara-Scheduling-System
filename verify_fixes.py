"""
Quick verification script for backend 500 error fixes.
Run this script to check if the appointment model fields are correctly handled.
"""

import os
import sys


def check_model_fields():
    """Check what fields actually exist in the Appointment model."""
    print("🔍 Checking Appointment model fields...")

    # Path to the models file
    models_file = os.path.join(
        os.path.dirname(__file__), "guitara", "scheduling", "models.py"
    )

    if not os.path.exists(models_file):
        print(f"❌ Models file not found: {models_file}")
        return

    with open(models_file, "r", encoding="utf-8") as f:
        content = f.read()

    # Find the Appointment class
    if "class Appointment(" not in content:
        print("❌ Appointment class not found in models.py")
        return

    print("✅ Found Appointment class")

    # Check for problematic fields that were causing 500 errors
    problematic_fields = [
        "pickup_requested",
        "pickup_urgency",
        "pickup_request_time",
        "pickup_driver",
    ]
    valid_fields = [
        "status",
        "therapist",
        "driver",
        "location",
        "notes",
        "therapist_accepted",
        "driver_accepted",
    ]

    for field in problematic_fields:
        if field in content:
            print(
                f"⚠️  Found problematic field '{field}' in model - this may cause issues"
            )
        else:
            print(f"✅ Problematic field '{field}' not found in model - good!")

    for field in valid_fields:
        if field in content:
            print(f"✅ Valid field '{field}' found in model")
        else:
            print(f"⚠️  Valid field '{field}' not found in model")


def check_serializer_fix():
    """Check if the serializer has been fixed."""
    print("\n🔍 Checking AppointmentSerializer fix...")

    serializer_file = os.path.join(
        os.path.dirname(__file__), "guitara", "scheduling", "serializers.py"
    )

    if not os.path.exists(serializer_file):
        print(f"❌ Serializer file not found: {serializer_file}")
        return

    with open(serializer_file, "r", encoding="utf-8") as f:
        content = f.read()

    # Check if status_update_fields has been fixed
    if "status_update_fields" in content:
        print("✅ Found status_update_fields definition")

        # Check for problematic fields in status_update_fields
        problematic_fields = [
            "pickup_requested",
            "pickup_urgency",
            "pickup_request_time",
        ]

        for field in problematic_fields:
            if f"'{field}'" in content and "status_update_fields" in content:
                print(f"⚠️  Found '{field}' in serializer - may cause 500 errors")
            else:
                print(f"✅ '{field}' not found in status_update_fields - good!")
    else:
        print("❌ status_update_fields not found in serializer")


def check_frontend_fixes():
    """Check if frontend components have been fixed."""
    print("\n🔍 Checking frontend component fixes...")

    components = [
        "royal-care-frontend/src/components/TherapistDashboard.jsx",
        "royal-care-frontend/src/components/OperatorDashboard.jsx",
        "royal-care-frontend/src/components/DriverDashboard.jsx",
    ]

    problematic_fields = [
        "pickup_requested",
        "pickup_urgency",
        "pickup_request_time",
        "pickup_driver",
    ]

    for component_path in components:
        full_path = os.path.join(os.path.dirname(__file__), component_path)

        if not os.path.exists(full_path):
            print(f"⚠️  Component file not found: {component_path}")
            continue

        print(f"\n📁 Checking {component_path}...")

        with open(full_path, "r", encoding="utf-8") as f:
            content = f.read()

        issues_found = 0
        for field in problematic_fields:
            # Look for the field being sent in updateAppointmentStatus calls
            if f"{field}:" in content and "updateAppointmentStatus" in content:
                lines = content.split("\n")
                for i, line in enumerate(lines):
                    if f"{field}:" in line and any(
                        "updateAppointmentStatus" in lines[j]
                        for j in range(max(0, i - 10), min(len(lines), i + 10))
                    ):
                        print(
                            f"⚠️  Found '{field}' being sent in status update around line {i+1}"
                        )
                        issues_found += 1
                        break

        if issues_found == 0:
            print(f"✅ No problematic fields found in {component_path}")


if __name__ == "__main__":
    print("🧪 Verifying Backend 500 Error Fixes\n")
    print("=" * 50)

    check_model_fields()
    check_serializer_fix()
    check_frontend_fixes()

    print("\n" + "=" * 50)
    print("✅ Verification complete!")
    print("\nIf you see any ⚠️ warnings above, those areas may still cause 500 errors.")
    print("All ✅ checks indicate the fixes are properly implemented.")
