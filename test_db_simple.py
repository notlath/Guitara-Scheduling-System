#!/usr/bin/env python3
"""
Simple database connection test for Railway deployment
"""

import os
import sys
from pathlib import Path

# Add the guitara directory to the path
guitara_dir = Path(__file__).parent / "guitara"
sys.path.insert(0, str(guitara_dir))
os.chdir(guitara_dir)

# Set minimal settings
os.environ["DJANGO_SETTINGS_MODULE"] = "guitara.settings_railway_minimal"

print("🔧 Testing Database Connection for Railway")
print("=" * 50)

# Check environment variables
print("Environment Variables:")
db_vars = ["SUPABASE_DB_HOST", "SUPABASE_DB_NAME", "SUPABASE_DB_USER"]
for var in db_vars:
    value = os.environ.get(var, "NOT SET")
    print(f"  {var}: {value}")

password = os.environ.get("SUPABASE_DB_PASSWORD")
print(f"  SUPABASE_DB_PASSWORD: {'SET' if password else 'NOT SET'}")

try:
    print("\n🚀 Setting up Django...")
    import django

    django.setup()
    print("✅ Django setup successful")

    print("\n🔍 Testing database connection...")
    import psycopg2

    # Test direct connection
    conn = psycopg2.connect(
        host=os.environ.get("SUPABASE_DB_HOST"),
        database=os.environ.get("SUPABASE_DB_NAME"),
        user=os.environ.get("SUPABASE_DB_USER"),
        password=os.environ.get("SUPABASE_DB_PASSWORD"),
        port="5432",
        sslmode="require",
        connect_timeout=30,
    )

    cursor = conn.cursor()
    cursor.execute("SELECT 1")
    result = cursor.fetchone()

    if result and result[0] == 1:
        print("✅ Direct database connection successful!")
    else:
        print("❌ Direct database connection failed")

    cursor.close()
    conn.close()

    print("\n🔍 Testing Django database connection...")
    from django.db import connection

    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        if result and result[0] == 1:
            print("✅ Django database connection successful!")
        else:
            print("❌ Django database connection failed")

    print("\n🎉 All database tests passed!")

except Exception as e:
    print(f"\n❌ Database test failed: {e}")
    import traceback

    traceback.print_exc()
    sys.exit(1)
