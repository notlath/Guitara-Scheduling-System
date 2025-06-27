#!/usr/bin/env python3
"""
Test WebSocket connection without token to see if endpoint is accessible
"""
import asyncio
import websockets


async def test_websocket_no_token():
    # WebSocket URL without token
    ws_url = "wss://charismatic-appreciation-production.up.railway.app/ws/scheduling/appointments/"

    print(f"Connecting to: {ws_url}")
    print("Testing without token...")

    try:
        # Try connection with timeout
        async with asyncio.timeout(10):  # 10 second timeout
            async with websockets.connect(
                ws_url, ping_interval=None, close_timeout=5
            ) as websocket:
                print("✅ WebSocket connection successful (no token)!")

                # Should be rejected quickly due to no authentication
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=5)
                    print(f"Received: {message}")
                except asyncio.TimeoutError:
                    print("No message received within 5 seconds")
                except websockets.exceptions.ConnectionClosedError as e:
                    print(f"Connection closed as expected: {e}")

    except asyncio.TimeoutError:
        print("❌ Connection timed out after 10 seconds")
    except websockets.exceptions.ConnectionClosedError as e:
        print(f"❌ Connection closed: {e}")
    except Exception as e:
        print(f"❌ Connection failed: {e}")


if __name__ == "__main__":
    asyncio.run(test_websocket_no_token())
