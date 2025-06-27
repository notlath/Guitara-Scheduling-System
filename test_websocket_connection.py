#!/usr/bin/env python3
"""
Test WebSocket connection with token to see detailed middleware logs
"""
import asyncio
import websockets
import urllib.parse


async def test_websocket_connection():
    # Token from logs
    token = "fc5f3662b3afaa3588a2777b59d8f79624981e8b175e94c1fa6088920547d694"

    # URL encode the token (same as frontend)
    encoded_token = urllib.parse.quote(token)

    # WebSocket URL with token
    ws_url = f"wss://charismatic-appreciation-production.up.railway.app/ws/scheduling/appointments/?token={encoded_token}"

    print(f"Connecting to: {ws_url[:80]}...")
    print(f"Token: {token[:20]}...")

    try:
        async with websockets.connect(ws_url) as websocket:
            print("✅ WebSocket connection successful!")

            # Wait for initial message
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=10)
                print(f"Received: {message}")
            except asyncio.TimeoutError:
                print("No message received within 10 seconds")

    except websockets.exceptions.ConnectionClosedError as e:
        print(f"❌ Connection closed: {e}")
    except Exception as e:
        print(f"❌ Connection failed: {e}")


if __name__ == "__main__":
    asyncio.run(test_websocket_connection())
