#!/usr/bin/env python
import os
import sys
import django
from django.core.management import execute_from_command_line

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
    try:
        django.setup()
        # Force run migrations
        print("Running migrations...")
        execute_from_command_line(["manage.py", "migrate", "--verbosity=2"])
        print("Migrations completed!")
    except Exception as e:
        print(f"Error running migrations: {e}")
        import traceback

        traceback.print_exc()
