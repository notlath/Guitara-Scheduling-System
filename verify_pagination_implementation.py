#!/usr/bin/env python
"""
Final verification script for pagination implementation
"""

import os
import re


def check_file_changes():
    """Verify all required changes are in place"""

    print("=== Pagination Implementation Verification ===\n")

    # Check SettingsDataPage.jsx
    settings_file = (
        "royal-care-frontend/src/pages/SettingsDataPage/SettingsDataPage.jsx"
    )
    if os.path.exists(settings_file):
        with open(settings_file, "r", encoding="utf-8") as f:
            content = f.read()

        checks = [
            ("useSearchParams import", "useSearchParams" in content),
            ("URL parameter handling", "searchParams.get" in content),
            ("handleTabChange function", "const handleTabChange" in content),
            ("updateUrlParams function", "const updateUrlParams" in content),
            ("Debug pagination panel", "Debug Pagination" in content),
            ("Enhanced fetchers", "📊 Updated pagination" in content),
            ("DEFAULT_PAGE_SIZE set for testing", "DEFAULT_PAGE_SIZE = 5" in content),
        ]

        print("✅ SettingsDataPage.jsx checks:")
        for check_name, passed in checks:
            status = "✅" if passed else "❌"
            print(f"   {status} {check_name}")
    else:
        print("❌ SettingsDataPage.jsx not found")

    # Check backend pagination format
    views_file = "guitara/registration/views.py"
    if os.path.exists(views_file):
        with open(views_file, "r", encoding="utf-8") as f:
            content = f.read()

        backend_checks = [
            ("RegisterClient returns DRF format", '"results": data' in content),
            ("Pagination metadata calculation", "total_pages = math.ceil" in content),
            (
                "Page size parameter handling",
                'request.query_params.get("page_size"' in content,
            ),
        ]

        print("\n✅ Backend views.py checks:")
        for check_name, passed in backend_checks:
            status = "✅" if passed else "❌"
            print(f"   {status} {check_name}")
    else:
        print("❌ registration/views.py not found")

    # Check utility scripts
    utility_files = [
        "toggle_page_size.py",
        "test_pagination_manually.py",
        "PAGINATION_IMPLEMENTATION_COMPLETE.md",
    ]

    print("\n✅ Utility files:")
    for filename in utility_files:
        exists = os.path.exists(filename)
        status = "✅" if exists else "❌"
        print(f"   {status} {filename}")

    print("\n🚀 Next Steps:")
    print("1. Run: python toggle_page_size.py  (ensure testing mode is enabled)")
    print("2. Start backend: cd guitara && python manage.py runserver")
    print("3. Start frontend: cd royal-care-frontend && npm run dev")
    print("4. Navigate to: http://localhost:5173/dashboard/settings/data?tab=Clients")
    print("5. Look for pagination buttons below the table")
    print("6. Check debug panel for pagination details")

    print("\n🎯 Success indicators:")
    print("- Pagination buttons visible with 5 items per page")
    print("- Debug panel shows totalPages > 1")
    print("- URL updates when changing pages")
    print("- Console logs show '📊 Updated pagination' messages")


if __name__ == "__main__":
    check_file_changes()
