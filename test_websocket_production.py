#!/usr/bin/env python3
"""
Test WebSocket connection to production Railway deployment
"""
import asyncio
import websockets
import json
import ssl


async def test_production_websocket():
    """Test WebSocket connection to Railway production"""

    # Production WebSocket URL
    uri = "wss://charismatic-appreciation-production.up.railway.app/ws/scheduling/appointments/"

    # Test without token first
    print(f"🔌 Testing WebSocket connection to: {uri}")

    try:
        # Create SSL context for WSS
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        async with websockets.connect(
            uri,
            ssl=ssl_context,
            timeout=10,
            extra_headers={
                "Origin": "https://guitara-scheduling-system.vercel.app",
                "User-Agent": "WebSocket-Test-Client/1.0",
            },
        ) as websocket:
            print("✅ WebSocket connection established!")

            # Send a test message
            test_message = {"type": "test", "message": "Hello from test client!"}
            await websocket.send(json.dumps(test_message))
            print(f"📤 Sent: {test_message}")

            # Wait for a response (with timeout)
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                print(f"📥 Received: {response}")
            except asyncio.TimeoutError:
                print("⏰ No response received within 5 seconds")

            print("🔌 Closing connection...")

    except websockets.exceptions.InvalidStatusCode as e:
        print(f"❌ WebSocket connection failed with status code: {e.status_code}")
        print(f"   Headers: {e.headers}")
    except websockets.exceptions.ConnectionClosed as e:
        print(f"❌ WebSocket connection closed: {e}")
    except Exception as e:
        print(f"❌ WebSocket connection failed: {e}")
        print(f"   Error type: {type(e)}")


async def test_with_token():
    """Test with a mock token"""
    uri = "wss://charismatic-appreciation-production.up.railway.app/ws/scheduling/appointments/?token=test_token"

    print(f"\n🔌 Testing with token parameter: {uri}")

    try:
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE

        async with websockets.connect(
            uri,
            ssl=ssl_context,
            timeout=10,
            extra_headers={
                "Origin": "https://guitara-scheduling-system.vercel.app",
            },
        ) as websocket:
            print("✅ WebSocket connection with token established!")

            # Wait for a response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                print(f"📥 Received: {response}")
            except asyncio.TimeoutError:
                print("⏰ No response received within 5 seconds")

    except Exception as e:
        print(f"❌ WebSocket connection with token failed: {e}")


if __name__ == "__main__":
    print("🧪 Testing Production WebSocket Connection...")
    print("=" * 60)

    asyncio.run(test_production_websocket())
    asyncio.run(test_with_token())

    print("\n" + "=" * 60)
    print("🔍 Next steps if connection fails:")
    print("1. Check Railway logs for WebSocket errors")
    print("2. Verify ASGI application is configured correctly")
    print("3. Ensure Daphne is starting with WebSocket support")
    print("4. Check that Railway is using the correct startup command")
