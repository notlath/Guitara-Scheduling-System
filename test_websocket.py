#!/usr/bin/env python3
"""
Test WebSocket connection to Django Channels
"""
import asyncio
import websockets
import json


async def test_websocket():
    uri = "ws://localhost:8000/ws/scheduling/appointments/"

    try:
        print(f"🔌 Connecting to: {uri}")
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket connection established!")

            # Send a test message
            test_message = {"type": "test", "message": "Hello WebSocket!"}
            await websocket.send(json.dumps(test_message))
            print(f"📤 Sent: {test_message}")

            # Wait for a response (with timeout)
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                print(f"📥 Received: {response}")
            except asyncio.TimeoutError:
                print(
                    "⏰ No response received within 5 seconds (this is normal for some WebSocket endpoints)"
                )

            print("🔌 Closing connection...")

    except websockets.exceptions.ConnectionClosed as e:
        print(f"❌ WebSocket connection closed: {e}")
    except Exception as e:
        print(f"❌ WebSocket connection failed: {e}")


if __name__ == "__main__":
    print("🧪 Testing WebSocket connection...")
    asyncio.run(test_websocket())
