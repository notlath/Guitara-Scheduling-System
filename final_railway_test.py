#!/usr/bin/env python3
"""
Final Railway Health Check Test
Test the optimized health endpoints that should work for Railway deployment
"""
import sys
import os
import time
from pathlib import Path

# Add the guitara directory to the path
guitara_dir = Path(__file__).parent / "guitara"
sys.path.insert(0, str(guitara_dir))
os.chdir(guitara_dir)

# Set minimal environment for Railway production settings
os.environ["DJANGO_SETTINGS_MODULE"] = "guitara.settings_production"
os.environ["SECRET_KEY"] = "test-railway-health-check-key"
os.environ["ALLOWED_HOSTS"] = "localhost,127.0.0.1,testserver,*.railway.app"
os.environ["DEBUG"] = "False"

# Mock required Railway environment variables
os.environ["RAILWAY_ENVIRONMENT"] = "production"
os.environ["SUPABASE_DB_NAME"] = "postgres"
os.environ["SUPABASE_DB_USER"] = "test_user"
os.environ["SUPABASE_DB_PASSWORD"] = "test_password"
os.environ["SUPABASE_DB_HOST"] = "localhost"

def test_railway_endpoints():
    """Test Railway health check endpoints"""
    print("🚀 RAILWAY HEALTH CHECK FINAL TEST")
    print("=" * 50)
    
    try:
        # Import and setup Django with timeout protection
        print("Setting up Django...")
        
        import django
        from django.conf import settings
        
        start_time = time.time()
        django.setup()
        setup_time = time.time() - start_time
        
        print(f"✅ Django setup completed in {setup_time:.3f}s")
        print(f"Settings module: {settings.SETTINGS_MODULE}")
        
        # Test the health check endpoints
        from django.test import Client
        
        client = Client()
        
        # Test Railway primary endpoints
        railway_endpoints = [
            ("/health/", "Railway Primary Health Check"),
            ("/healthcheck/", "Railway Alternative Health Check"),
            ("/ping/", "Railway Ping"),
        ]
        
        success_count = 0
        total_time = 0
        
        for endpoint, name in railway_endpoints:
            try:
                print(f"\n🧪 Testing {name}: {endpoint}")
                
                start_time = time.time()
                response = client.get(endpoint)
                response_time = time.time() - start_time
                total_time += response_time
                
                print(f"   ⏱️  Response time: {response_time:.3f}s")
                print(f"   📊 Status Code: {response.status_code}")
                
                if response.status_code == 200:
                    print(f"   ✅ {name} - SUCCESS")
                    success_count += 1
                    
                    # Parse and display response
                    try:
                        if hasattr(response, 'json'):
                            data = response.json()
                        else:
                            import json
                            data = json.loads(response.content.decode())
                        print(f"   📝 Response: {data}")
                    except:
                        content = response.content.decode()
                        print(f"   📝 Response: {content[:200]}")
                        
                    # Validate response speed for Railway
                    if response_time < 5.0:  # Railway timeout is 30s, we want much faster
                        print(f"   🚀 Speed: EXCELLENT ({response_time:.3f}s < 5s)")
                    else:
                        print(f"   ⚠️  Speed: TOO SLOW ({response_time:.3f}s)")
                        
                else:
                    print(f"   ❌ {name} - FAILED (Status: {response.status_code})")
                    print(f"   📝 Response: {response.content.decode()}")
                    
            except Exception as e:
                print(f"   💥 {name} - ERROR: {e}")
                import traceback
                traceback.print_exc()
        
        # Summary
        print("\n" + "=" * 50)
        print("RAILWAY DEPLOYMENT READINESS SUMMARY")
        print("=" * 50)
        print(f"✅ Successful endpoints: {success_count}/{len(railway_endpoints)}")
        print(f"⏱️  Total response time: {total_time:.3f}s")
        print(f"⚡ Average response time: {total_time/len(railway_endpoints):.3f}s")
        
        if success_count == len(railway_endpoints):
            if total_time < 10.0:  # All endpoints should respond in under 10 seconds total
                print("\n🎉 RAILWAY DEPLOYMENT READY!")
                print("✅ All health check endpoints are working")
                print("✅ Response times are optimal for Railway")
                print("🚀 Deploy to Railway should succeed")
                return True
            else:
                print("\n⚠️  DEPLOYMENT MAY SUCCEED BUT SLOW")
                print("✅ All endpoints work but response times are slow")
                return True
        else:
            print("\n❌ DEPLOYMENT WILL FAIL")
            print("💥 Some health check endpoints are not working")
            print("🔧 Fix required before Railway deployment")
            return False
            
    except Exception as e:
        print(f"\n💥 CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = test_railway_endpoints()
    sys.exit(0 if success else 1)
