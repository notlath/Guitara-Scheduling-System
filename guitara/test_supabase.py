#!/usr/bin/env python
import os
import django

# Set up Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")
django.setup()

# Now test Supabase connection
from registration.supabase_client import get_supabase_client


def test_supabase_connection():
    print("Testing Supabase connection...")
    client = get_supabase_client()

    if client:
        print("✅ Supabase client created successfully")
        # Test a simple operation
        try:
            result = (
                client.table("registration_operator").select("*").limit(1).execute()
            )
            print("✅ Test query successful")
            print(
                f"Data returned: {bool(result.data) if hasattr(result, 'data') else 'No data attribute'}"
            )
            if hasattr(result, "error") and result.error:
                print(f"⚠️  Query error: {result.error}")
        except Exception as e:
            print(f"❌ Test query failed: {str(e)}")
    else:
        print("❌ Failed to create Supabase client")


if __name__ == "__main__":
    test_supabase_connection()
