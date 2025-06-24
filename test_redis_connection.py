#!/usr/bin/env python
"""
Test Redis connection and cache functionality
"""
import os
import sys
import django

# Add the project directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), "guitara"))

# Set the Django settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")

# Setup Django
django.setup()

from django.core.cache import cache
from django.conf import settings


def test_redis_connection():
    """Test Redis connection and basic cache operations"""
    print("🔍 Testing Redis connection and cache functionality...")

    try:
        # Test basic cache operations
        test_key = "redis_test_key"
        test_value = "redis_test_value"

        # Set a value
        cache.set(test_key, test_value, 60)
        print(f"✅ Set cache value: {test_key} = {test_value}")

        # Get the value
        retrieved_value = cache.get(test_key)
        print(f"✅ Retrieved cache value: {test_key} = {retrieved_value}")

        # Verify the value matches
        if retrieved_value == test_value:
            print("✅ Cache operation successful!")
        else:
            print(f"❌ Cache mismatch: expected {test_value}, got {retrieved_value}")
            return False

        # Delete the test key
        cache.delete(test_key)
        print("✅ Cache cleanup completed")

        # Test cache info
        print(f"📊 Cache backend: {settings.CACHES['default']['BACKEND']}")
        print(f"📊 Cache location: {settings.CACHES['default'].get('LOCATION', 'N/A')}")

        return True

    except Exception as e:
        print(f"❌ Redis connection test failed: {e}")
        return False


def test_channel_layers():
    """Test Channel Layers configuration"""
    print("\n🔍 Testing Channel Layers configuration...")

    try:
        from channels.layers import get_channel_layer

        channel_layer = get_channel_layer()
        if channel_layer:
            print(f"✅ Channel layer configured: {type(channel_layer).__name__}")
            print(
                f"📊 Channel backend: {settings.CHANNEL_LAYERS['default']['BACKEND']}"
            )
            return True
        else:
            print("❌ Channel layer not configured")
            return False

    except Exception as e:
        print(f"❌ Channel layer test failed: {e}")
        return False


def main():
    """Run all Redis and WebSocket tests"""
    print("🚀 Starting Redis and WebSocket connectivity tests...\n")

    # Test cache functionality
    cache_success = test_redis_connection()

    # Test channel layers
    channel_success = test_channel_layers()

    print("\n" + "=" * 50)
    if cache_success and channel_success:
        print("🎉 All tests passed! Redis and WebSocket are working correctly.")
        sys.exit(0)
    else:
        print("⚠️ Some tests failed. Check your Redis configuration.")
        sys.exit(1)


if __name__ == "__main__":
    main()
