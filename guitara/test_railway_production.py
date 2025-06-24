#!/usr/bin/env python3
"""
Railway Production Environment Test Script
Tests all components needed for successful deployment
"""

import os
import sys
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

def test_environment():
    """Test Railway environment variables"""
    print("🧪 TESTING RAILWAY PRODUCTION ENVIRONMENT")
    print("=" * 50)
    
    # Test Django settings
    django_settings = os.environ.get("DJANGO_SETTINGS_MODULE")
    print(f"Django Settings Module: {django_settings}")
    
    if django_settings != "guitara.settings_production":
        print("⚠️  WARNING: Django settings should be 'guitara.settings_production'")
        print(f"   Current: {django_settings}")
    else:
        print("✅ Django settings correct")
    
    # Test required environment variables
    required_vars = [
        "SUPABASE_DB_NAME",
        "SUPABASE_DB_USER", 
        "SUPABASE_DB_PASSWORD",
        "SUPABASE_DB_HOST",
        "SECRET_KEY",
        "ALLOWED_HOSTS"
    ]
    
    print("\n🔧 ENVIRONMENT VARIABLES:")
    missing_vars = []
    for var in required_vars:
        value = os.environ.get(var)
        if value:
            if var == "SUPABASE_DB_PASSWORD":
                print(f"  {var}: {'*' * len(value)} (hidden)")
            elif var == "SECRET_KEY":
                print(f"  {var}: {value[:10]}... (truncated)")
            else:
                print(f"  {var}: {value}")
        else:
            print(f"  {var}: ❌ MISSING")
            missing_vars.append(var)
    
    if missing_vars:
        print(f"\n❌ Missing required variables: {missing_vars}")
        return False
    else:
        print("\n✅ All required environment variables present")
    
    # Test Django import
    print("\n🧪 TESTING DJANGO IMPORT:")
    try:
        import django
        print(f"  Django version: {django.get_version()}")
        
        django.setup()
        print("  Django setup: ✅ SUCCESS")
        
        # Test database connection
        from django.db import connection
        print("  Testing database connection...")
        
        with connection.cursor() as cursor:
            cursor.execute("SELECT version()")
            result = cursor.fetchone()
            print(f"  Database: ✅ PostgreSQL connected - {result[0][:50]}...")
            
    except Exception as e:
        print(f"  Django/Database: ❌ FAILED - {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test CORS configuration
    print("\n🌐 TESTING CORS CONFIGURATION:")
    try:
        from django.conf import settings
        cors_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
        print(f"  CORS Origins: {cors_origins}")
        
        if 'https://guitara-scheduling-system.vercel.app' in cors_origins:
            print("  Frontend CORS: ✅ Vercel frontend allowed")
        else:
            print("  Frontend CORS: ⚠️  Vercel frontend not in CORS origins")
            
    except Exception as e:
        print(f"  CORS: ❌ FAILED - {e}")
    
    print("\n🚀 ENVIRONMENT TEST COMPLETE")
    return True

if __name__ == "__main__":
    # Set production settings for test
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings_production")
    
    success = test_environment()
    
    if success:
        print("\n✅ Environment is ready for Railway deployment!")
        sys.exit(0)
    else:
        print("\n❌ Environment has issues - check configuration")
        sys.exit(1)
