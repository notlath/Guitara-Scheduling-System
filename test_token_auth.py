#!/usr/bin/env python3
"""
Test token authentication for WebSocket
"""
import os
import sys
import django
import traceback

# Add Django project to path
sys.path.append(os.path.join(os.path.dirname(__file__), "guitara"))

# Set production settings to match Railway
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings_production")
os.environ.setdefault(
    "REDIS_URL",
    "redis://default:OZAurZgciODtPejgVDYSJHQtODNQDTBj@trolley.proxy.rlwy.net:12062",
)

try:
    django.setup()

    from knox.auth import TokenAuthentication
    from rest_framework.exceptions import AuthenticationFailed

    print("=== TOKEN AUTHENTICATION TEST ===")

    # Test token from your logs
    test_token = "fc5f3662b3afaa3588a2777b59d8f79624981e8b175e94c1fa6088920547d694"

    print(f"Testing token: {test_token[:20]}...")

    # Test Knox authentication
    try:
        token_auth = TokenAuthentication()

        # Test with string first (this was failing before)
        print("\n🧪 Testing string token...")
        try:
            user, auth_token = token_auth.authenticate_credentials(test_token)
            print(f"❌ String authentication succeeded unexpectedly: {user}")
        except Exception as e:
            print(f"✅ String authentication failed as expected: {e}")

        # Test with bytes (correct way)
        print("\n🧪 Testing bytes token...")
        try:
            token_bytes = test_token.encode("utf-8")
            user, auth_token = token_auth.authenticate_credentials(token_bytes)
            print(
                f"✅ Bytes authentication succeeded: User {user.id} ({user.username})"
            )
            print(f"   Token: {auth_token}")
            print(f"   User role: {user.role}")
        except AuthenticationFailed as e:
            print(f"❌ Bytes authentication failed: {e}")
        except Exception as e:
            print(f"❌ Bytes authentication error: {e}")
            traceback.print_exc()

    except Exception as e:
        print(f"❌ TokenAuthentication setup failed: {e}")
        traceback.print_exc()

    # Test database connection (Knox needs database)
    print("\n=== DATABASE CONNECTION TEST ===")
    try:
        from django.db import connection

        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            print(f"✅ Database connection successful: {result}")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        print("   This could be why token authentication is failing!")

except Exception as e:
    print(f"❌ Django setup failed: {e}")
    traceback.print_exc()
