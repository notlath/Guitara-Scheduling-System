#!/usr/bin/env python
"""
Utility script to toggle DEFAULT_PAGE_SIZE for testing pagination
"""
import re
import sys
import os


def toggle_page_size():
    """Toggle DEFAULT_PAGE_SIZE between 5 (for testing) and 100 (for production)"""

    settings_file = (
        "royal-care-frontend/src/pages/SettingsDataPage/SettingsDataPage.jsx"
    )

    if not os.path.exists(settings_file):
        print(f"❌ File not found: {settings_file}")
        return

    with open(settings_file, "r", encoding="utf-8") as f:
        content = f.read()

    # Check current value
    current_match = re.search(r"const DEFAULT_PAGE_SIZE = (\d+);", content)
    if not current_match:
        print("❌ Could not find DEFAULT_PAGE_SIZE in the file")
        return

    current_value = int(current_match.group(1))

    if current_value == 5:
        # Change back to production value
        new_value = 100
        new_content = re.sub(
            r"const DEFAULT_PAGE_SIZE = 5; // Changed from 100 to 5 to test pagination",
            "const DEFAULT_PAGE_SIZE = 100; // Increased default to show all records",
            content,
        )
        action = "Restored to production"
    elif current_value == 100:
        # Change to testing value
        new_value = 5
        new_content = re.sub(
            r"const DEFAULT_PAGE_SIZE = 100; // Increased default to show all records",
            "const DEFAULT_PAGE_SIZE = 5; // Changed from 100 to 5 to test pagination",
            content,
        )
        action = "Set for testing"
    else:
        print(f"⚠️ Unexpected DEFAULT_PAGE_SIZE value: {current_value}")
        print("Please manually set it to either 5 (testing) or 100 (production)")
        return

    # Write the updated content
    with open(settings_file, "w", encoding="utf-8") as f:
        f.write(new_content)

    print(f"✅ {action}: DEFAULT_PAGE_SIZE changed from {current_value} to {new_value}")
    print(f"📄 File updated: {settings_file}")

    if new_value == 5:
        print("\n🧪 Testing mode enabled!")
        print(
            "- Navigate to Settings Data Page to see pagination with 5 items per page"
        )
        print("- Remember to toggle back to production mode when done")
    else:
        print("\n🚀 Production mode restored!")
        print("- Default page size is now 100 items per page")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] in ["-h", "--help"]:
        print("Usage: python toggle_page_size.py")
        print("Toggles DEFAULT_PAGE_SIZE between 5 (testing) and 100 (production)")
    else:
        toggle_page_size()
