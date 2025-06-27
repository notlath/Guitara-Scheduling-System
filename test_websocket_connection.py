#!/usr/bin/env python3
"""
WebSocket Connection Test Script
Tests WebSocket connectivity for both local and production environments
"""

import asyncio
import websockets
import json
import sys

# Test URLs - update these as needed
LOCAL_WS_URL = "ws://localhost:8000/ws/scheduling/appointments/"
PROD_WS_URL = "wss://charismatic-appreciation-production.up.railway.app/ws/scheduling/appointments/"

# Sample Knox token for testing (replace with actual token)
SAMPLE_TOKEN = "your_knox_token_here"


async def test_websocket_connection(url, token=None):
    """Test WebSocket connection with optional authentication"""

    # Add token to URL if provided
    if token:
        test_url = f"{url}?token={token}"
    else:
        test_url = url

    print(f"\n🔌 Testing WebSocket connection to: {test_url}")

    try:
        # Set connection timeout
        timeout = 10

        # Connect to WebSocket
        async with websockets.connect(test_url, timeout=timeout) as websocket:
            print("✅ WebSocket connected successfully!")

            # Send a test message
            test_message = {"type": "heartbeat", "timestamp": "2025-06-27T10:00:00Z"}

            await websocket.send(json.dumps(test_message))
            print("📤 Test message sent")

            # Wait for response (with timeout)
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                print(f"📥 Response received: {response}")
                return True
            except asyncio.TimeoutError:
                print("⏰ No response received within 5 seconds")
                return True  # Connection succeeded, just no response

    except websockets.exceptions.ConnectionClosed as e:
        print(f"❌ WebSocket connection closed: {e}")
        return False
    except websockets.exceptions.WebSocketException as e:
        print(f"❌ WebSocket error: {e}")
        return False
    except OSError as e:
        print(f"❌ Network error: {e}")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False


async def main():
    """Main test function"""
    print("🧪 WebSocket Connection Test Script")
    print("=" * 50)

    # Test without authentication first
    print("\n1. Testing LOCAL WebSocket (no auth):")
    local_success = await test_websocket_connection(LOCAL_WS_URL)

    print("\n2. Testing PRODUCTION WebSocket (no auth):")
    prod_success = await test_websocket_connection(PROD_WS_URL)

    # Test with authentication if token is provided
    if SAMPLE_TOKEN != "your_knox_token_here":
        print("\n3. Testing LOCAL WebSocket (with auth):")
        local_auth_success = await test_websocket_connection(LOCAL_WS_URL, SAMPLE_TOKEN)

        print("\n4. Testing PRODUCTION WebSocket (with auth):")
        prod_auth_success = await test_websocket_connection(PROD_WS_URL, SAMPLE_TOKEN)
    else:
        print("\n⚠️ No token provided - skipping authenticated tests")
        print("   Update SAMPLE_TOKEN in the script to test authentication")

    # Summary
    print("\n" + "=" * 50)
    print("📊 Test Summary:")
    print(f"   Local (no auth): {'✅ PASS' if local_success else '❌ FAIL'}")
    print(f"   Production (no auth): {'✅ PASS' if prod_success else '❌ FAIL'}")

    if not local_success and not prod_success:
        print("\n❌ All tests failed. Check:")
        print("   1. Backend server is running")
        print("   2. WebSocket endpoints are configured")
        print("   3. Network connectivity")
    elif local_success or prod_success:
        print("\n✅ At least one connection succeeded!")
        if not local_success:
            print("   💡 Local connection failed - is the dev server running?")
        if not prod_success:
            print("   💡 Production connection failed - check Railway deployment")


if __name__ == "__main__":
    # Install websockets if not available
    try:
        import websockets
    except ImportError:
        print("❌ websockets library not found")
        print("Install with: pip install websockets")
        sys.exit(1)

    # Run the test
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⚠️ Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
