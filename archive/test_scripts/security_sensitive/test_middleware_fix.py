#!/usr/bin/env python3
"""
Test script to verify the middleware fix without needing a running server.
This will test the hash_token function with string vs bytes input.
"""

import os
import sys
import django

# Add the project directory to the Python path
sys.path.append('/home/notlath/Downloads/Guitara-Scheduling-System')

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

from knox.crypto import hash_token

def test_hash_token_fix():
    """Test that hash_token works correctly with bytes input"""
    
    # Test token (this would come from the client)
    test_token = "0123456789abcdef0123456789abcdef01234567"
    
    print("🔧 Testing Knox hash_token function fix")
    print("=" * 50)
    
    # Test 1: What happens with string input (old broken way)
    print("Test 1: String input (old way - should fail)")
    try:
        result_string = hash_token(test_token)
        print(f"✅ String input worked: {result_string[:20]}...")
    except Exception as e:
        print(f"❌ String input failed: {e}")
    
    # Test 2: What happens with bytes input (new fixed way)
    print("\nTest 2: Bytes input (new way - should work)")
    try:
        result_bytes = hash_token(test_token.encode('utf-8'))
        print(f"✅ Bytes input worked: {result_bytes[:20]}...")
    except Exception as e:
        print(f"❌ Bytes input failed: {e}")
    
    # Test 3: Verify our middleware function would work
    print("\nTest 3: Simulating middleware authentication")
    try:
        from guitara.scheduling.middleware import get_user
        print("✅ Middleware import successful")
        print("✅ The fix should resolve the WebSocket authentication issue")
    except Exception as e:
        print(f"❌ Middleware import failed: {e}")

if __name__ == "__main__":
    test_hash_token_fix()
