#!/usr/bin/env python3
"""
Quick test to verify that no unauthenticated WebSocket connections are being made
"""
import asyncio
import websockets
import ssl


async def test_unauthenticated_connection():
    """Test that unauthenticated connections are properly rejected"""

    # Try connecting without a token (this should fail with proper error)
    ws_url = "wss://charismatic-appreciation-production.up.railway.app/ws/scheduling/appointments/"

    print(f"Testing unauthenticated connection to: {ws_url}")

    try:
        # Set a short timeout to avoid hanging
        async with websockets.connect(
            ws_url, ping_timeout=5, close_timeout=5
        ) as websocket:
            print(
                "❌ ERROR: Unauthenticated connection was accepted (this should not happen)"
            )

            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=3)
                print(f"Received message: {message}")
            except asyncio.TimeoutError:
                print("No message received")

    except websockets.exceptions.ConnectionClosedError as e:
        print(f"✅ GOOD: Connection properly closed - {e}")
    except Exception as e:
        print(f"✅ GOOD: Connection failed as expected - {e}")


if __name__ == "__main__":
    asyncio.run(test_unauthenticated_connection())
