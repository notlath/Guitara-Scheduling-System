#!/usr/bin/env python3
"""
Simple WebSocket Test
"""
import asyncio
import websockets
import json

async def test_websocket_simple():
    print("=== Simple WebSocket Test ===\n")
    
    # Test basic WebSocket connection
    try:
        # Use the correct URL pattern from routing.py
        uri = "ws://localhost:8000/ws/scheduling/appointments/"
        print(f"Connecting to: {uri}")
        
        async with websockets.connect(uri, timeout=10) as websocket:
            print("✓ WebSocket connection established")
            
            # Send a test message
            test_message = {"type": "test", "message": "Hello from client"}
            await websocket.send(json.dumps(test_message))
            print("✓ Message sent")
            
            # Try to receive a response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                print(f"✓ Response received: {response}")
            except asyncio.TimeoutError:
                print("! No response received (timeout)")
                
    except Exception as e:
        print(f"✗ Connection failed: {e}")

    # Test with token
    print("\n=== Testing with Token ===")
    try:
        # Use a test token
        test_token = "d662c601"  # The token we see in logs
        uri = f"ws://localhost:8000/ws/scheduling/appointments/?token={test_token}"
        print(f"Connecting to: {uri}")
        
        async with websockets.connect(uri, timeout=10) as websocket:
            print("✓ WebSocket connection with token established")
            
            # Send a test message
            test_message = {"type": "test", "message": "Authenticated hello"}
            await websocket.send(json.dumps(test_message))
            print("✓ Message sent")
            
            # Try to receive a response
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5)
                print(f"✓ Response received: {response}")
            except asyncio.TimeoutError:
                print("! No response received (timeout)")
                
    except Exception as e:
        print(f"✗ Connection with token failed: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(test_websocket_simple())
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
    except Exception as e:
        print(f"Test failed: {e}")
