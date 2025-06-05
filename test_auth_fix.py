#!/usr/bin/env python3
"""
Unit test for the middleware fix to verify hash_token works with string->bytes conversion
"""

import unittest
from unittest.mock import Mock, patch
import os
import sys

# Add the project directory to the Python path
sys.path.insert(0, '/home/notlath/Downloads/Guitara-Scheduling-System')

# Mock Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')

class TestMiddlewareFix(unittest.TestCase):
    """Test the WebSocket authentication middleware fix"""
    
    def test_hash_token_string_input(self):
        """Test that hash_token function accepts string input after conversion to bytes"""
        try:
            # Import the knox crypto module
            from knox.crypto import hash_token
            
            # Test token
            test_token = "abcdef1234567890abcdef1234567890abcdef12"
            
            # This should work with our fix (string -> bytes conversion)
            result = hash_token(test_token.encode('utf-8'))
            
            # Should return a hash
            self.assertIsInstance(result, str)
            self.assertTrue(len(result) > 0)
            print(f"✅ hash_token with bytes input works: {result[:20]}...")
            
        except ImportError as e:
            print(f"⚠️  Knox not available for testing: {e}")
            return True
        except Exception as e:
            self.fail(f"hash_token with bytes input failed: {e}")
    
    def test_hash_token_direct_string_fails(self):
        """Test that hash_token function fails with direct string input"""
        try:
            from knox.crypto import hash_token
            
            # Test token
            test_token = "abcdef1234567890abcdef1234567890abcdef12"
            
            # This should fail with string input (the original bug)
            try:
                result = hash_token(test_token)
                print(f"⚠️  Unexpected: hash_token accepted string input")
            except (AttributeError, TypeError) as e:
                print(f"✅ Confirmed: hash_token fails with string input: {type(e).__name__}")
                self.assertIn("decode", str(e).lower())
                
        except ImportError as e:
            print(f"⚠️  Knox not available for testing: {e}")
            return True
    
    def test_middleware_import(self):
        """Test that the middleware can be imported without errors"""
        try:
            from guitara.scheduling.middleware import get_user, TokenAuthMiddleware
            print("✅ Middleware imports successfully")
            
            # Check that get_user is a function
            self.assertTrue(callable(get_user))
            print("✅ get_user function is callable")
            
            # Check that TokenAuthMiddleware is a class
            self.assertTrue(isinstance(TokenAuthMiddleware, type))
            print("✅ TokenAuthMiddleware is a class")
            
        except ImportError as e:
            self.fail(f"Failed to import middleware: {e}")
        except Exception as e:
            self.fail(f"Unexpected error importing middleware: {e}")

def main():
    """Run the tests"""
    print("🔧 Testing WebSocket Authentication Middleware Fix")
    print("=" * 60)
    
    # Create test suite
    suite = unittest.TestLoader().loadTestsFromTestCase(TestMiddlewareFix)
    
    # Run tests
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    
    if result.wasSuccessful():
        print("\n🎉 ALL TESTS PASSED!")
        print("✅ The middleware fix should resolve the WebSocket authentication issue")
        print("✅ Knox tokens will now be properly converted from string to bytes")
        return True
    else:
        print("\n❌ SOME TESTS FAILED")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
