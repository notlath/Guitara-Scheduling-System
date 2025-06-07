#!/usr/bin/env python3
"""
Django management command to check and fix staff member is_active status
"""

import os
import sys
import django
from pathlib import Path

# Setup Django environment
project_root = Path(__file__).parent / "guitara"
sys.path.insert(0, str(project_root))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")

try:
    django.setup()
    from core.models import CustomUser

    def check_and_fix_staff_status():
        """Check and optionally fix staff member is_active status"""
        print("🔍 Checking staff member is_active status...")

        # Get all staff members
        staff_members = CustomUser.objects.filter(role__in=["therapist", "driver"])

        print(f"\nFound {staff_members.count()} staff members:")

        active_count = 0
        inactive_count = 0

        for staff in staff_members:
            status = "ACTIVE" if staff.is_active else "DISABLED"
            print(
                f"   👤 {staff.first_name} {staff.last_name} ({staff.role}) - {status}"
            )

            if staff.is_active:
                active_count += 1
            else:
                inactive_count += 1

        print(f"\nSummary:")
        print(f"   ✅ Active: {active_count}")
        print(f"   ❌ Disabled: {inactive_count}")

        if inactive_count > 0:
            print(f"\n🔧 Would you like to enable all disabled staff members? (y/n)")
            response = input().lower().strip()

            if response == "y" or response == "yes":
                print(f"🔄 Enabling all disabled staff members...")

                disabled_staff = staff_members.filter(is_active=False)
                count = disabled_staff.update(is_active=True)

                print(f"✅ Enabled {count} staff member(s)")

                # Verify the change
                print(f"\n🔍 Verification - Updated status:")
                for staff in staff_members:
                    status = "ACTIVE" if staff.is_active else "DISABLED"
                    print(
                        f"   👤 {staff.first_name} {staff.last_name} ({staff.role}) - {status}"
                    )
            else:
                print(f"ℹ️ No changes made")
        else:
            print(f"✅ All staff members are already active!")

    if __name__ == "__main__":
        check_and_fix_staff_status()

except Exception as e:
    print(f"❌ Error: {e}")
    import traceback

    traceback.print_exc()
