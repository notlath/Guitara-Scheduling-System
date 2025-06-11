#!/usr/bin/env python3
"""
Simple test to check if Django can start without errors
"""

import subprocess
import sys
import os

# Change to guitara directory
os.chdir("/home/notlath/Downloads/Guitara-Scheduling-System/guitara")

try:
    # Test if Django can check for issues
    result = subprocess.run(
        [sys.executable, "manage.py", "check"],
        capture_output=True,
        text=True,
        timeout=30,
    )

    print("Django check output:")
    print("STDOUT:", result.stdout)
    print("STDERR:", result.stderr)
    print("Return code:", result.returncode)

    if result.returncode == 0:
        print("✅ Django check passed")

        # Test migrations
        migrate_result = subprocess.run(
            [sys.executable, "manage.py", "showmigrations"],
            capture_output=True,
            text=True,
            timeout=30,
        )

        print("\nMigrations status:")
        print(migrate_result.stdout)

    else:
        print("❌ Django check failed")

except subprocess.TimeoutExpired:
    print("❌ Django check timed out")
except Exception as e:
    print(f"❌ Error running Django check: {e}")
