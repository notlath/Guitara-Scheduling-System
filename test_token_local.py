#!/usr/bin/env python3
"""
Test token authentication locally
"""
import os
import sys
import django
import traceback

# Add Django project to path
sys.path.append(os.path.join(os.path.dirname(__file__), "guitara"))

# Use development settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")

try:
    django.setup()

    from knox.auth import TokenAuthentication
    from rest_framework.exceptions import AuthenticationFailed
    from knox.models import AuthToken
    from django.contrib.auth import get_user_model

    print("=== LOCAL TOKEN AUTHENTICATION TEST ===")

    # Test token from Railway logs
    test_token = "fc5f3662b3afaa3588a2777b59d8f79624981e8b175e94c1fa6088920547d694"

    print(f"Testing token: {test_token[:20]}...")

    # Check if this token exists in the database
    print("\n🔍 Checking if token exists in database...")
    try:
        User = get_user_model()

        # Look for any tokens that might match
        tokens = AuthToken.objects.all()
        print(f"Total tokens in database: {tokens.count()}")

        if tokens.count() > 0:
            print("Available tokens:")
            for token in tokens[:5]:  # Show first 5
                print(f"  Token digest: {token.digest[:20]}...")
                print(f"  User: {token.user.username}")
                print(f"  Created: {token.created}")
                print()

        # Try to find matching token
        matching_tokens = AuthToken.objects.filter(digest__startswith=test_token[:8])
        if matching_tokens.exists():
            print(f"✅ Found {matching_tokens.count()} potentially matching tokens")
        else:
            print("❌ No matching tokens found in database")
            print("   This explains why authentication is failing!")

    except Exception as e:
        print(f"❌ Database query failed: {e}")
        traceback.print_exc()

    # Test Knox authentication
    print("\n🧪 Testing Knox authentication...")
    try:
        token_auth = TokenAuthentication()

        # Test with bytes (correct way)
        try:
            token_bytes = test_token.encode("utf-8")
            user, auth_token = token_auth.authenticate_credentials(token_bytes)
            print(f"✅ Authentication succeeded: User {user.id} ({user.username})")
        except AuthenticationFailed as e:
            print(f"❌ Authentication failed: {e}")
        except Exception as e:
            print(f"❌ Authentication error: {e}")

    except Exception as e:
        print(f"❌ TokenAuthentication setup failed: {e}")
        traceback.print_exc()

except Exception as e:
    print(f"❌ Django setup failed: {e}")
    traceback.print_exc()
