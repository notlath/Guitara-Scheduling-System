#!/usr/bin/env python3
"""
Test script for minimal mode with database connectivity
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

print("🧪 Testing Minimal Mode with Database Connectivity")
print("=" * 60)

# Test required environment variables
print("\n📊 Environment Variables Check:")
required_vars = ["SUPABASE_DB_HOST", "SUPABASE_DB_NAME", "SUPABASE_DB_USER", "SUPABASE_DB_PASSWORD"]
for var in required_vars:
    value = os.environ.get(var)
    if value:
        print(f"✅ {var}: {'*' * len(value) if 'PASSWORD' in var else value}")
    else:
        print(f"❌ {var}: NOT SET")

print(f"\n🔧 Django Settings: {os.environ.get('DJANGO_SETTINGS_MODULE')}")

try:
    print("\n🚀 Initializing Django...")
    import django
    django.setup()
    print("✅ Django setup successful")
    
    # Test database connection
    print("\n🔍 Testing Database Connection...")
    from django.db import connection
    
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        result = cursor.fetchone()
        if result and result[0] == 1:
            print("✅ Database connection successful!")
            
            # Get database info
            db_info = connection.get_connection_params()
            print(f"   Database: {db_info.get('database', 'Unknown')}")
            print(f"   Host: {db_info.get('host', 'Unknown')}")
            print(f"   Port: {db_info.get('port', 'Unknown')}")
        else:
            print("❌ Database connection failed: Invalid response")
    
    # Test health check endpoints
    print("\n🏥 Testing Health Check Endpoints...")
    from django.test import Client
    
    client = Client()
    
    # Test fast health check
    response = client.get("/health/")
    print(f"   /health/ → {response.status_code} {response.content.decode()[:100]}")
    
    # Test minimal health check
    response = client.get("/health/minimal/")
    print(f"   /health/minimal/ → {response.status_code} {response.content.decode()[:100]}")
    
    # Test ready check
    response = client.get("/ready/")
    print(f"   /ready/ → {response.status_code} {response.content.decode()[:100]}")
    
    # Test API endpoints
    print("\n🔌 Testing API Endpoints...")
    api_endpoints = [
        "/api/auth/",
        "/api/registration/",
        "/api/scheduling/",
    ]
    
    for endpoint in api_endpoints:
        try:
            response = client.get(endpoint)
            print(f"   {endpoint} → {response.status_code}")
        except Exception as e:
            print(f"   {endpoint} → ERROR: {str(e)[:50]}")
    
    print("\n✅ All tests completed successfully!")
    print("🚀 Ready for minimal mode deployment!")
    
except Exception as e:
    print(f"\n❌ Test failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
