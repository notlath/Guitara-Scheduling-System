#!/usr/bin/env python3
"""
Simple WebSocket connectivity test
"""
import asyncio
import websockets
import json
import requests

async def simple_test():
    """Test basic WebSocket connectivity"""
    print("🔄 Simple WebSocket Test")
    print("=" * 50)
    
    # Get token
    print("1. Getting authentication token...")
    try:
        response = requests.post(
            "http://localhost:8000/api/auth/login/",
            json={"username": "testtherapist", "password": "password123"}
        )
        
        if response.status_code == 200:
            token = response.json().get("token")
            print(f"✓ Token obtained: {token[:20]}...")
        else:
            print(f"✗ Login failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
    except Exception as e:
        print(f"✗ Error: {e}")
        return False
    
    # Test WebSocket connection
    print("\n2. Testing WebSocket connection...")
    ws_uri = f"ws://localhost:8000/ws/scheduling/appointments/?token={token}"
    print(f"Connecting to: {ws_uri}")
    
    try:
        async with websockets.connect(ws_uri) as websocket:
            print("✓ WebSocket connected successfully!")
            
            # Try to receive initial message
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(message)
                print(f"✓ Received message: {data.get('type', 'unknown')}")
                return True
            except asyncio.TimeoutError:
                print("⚠ No initial message (this might be normal)")
                return True
            except Exception as e:
                print(f"⚠ Error receiving message: {e}")
                return True
                
    except Exception as e:
        print(f"✗ WebSocket connection failed: {e}")
        return False

if __name__ == "__main__":
    result = asyncio.run(simple_test())
    if result:
        print("\n✅ WEBSOCKET CONNECTION TEST PASSED")
    else:
        print("\n❌ WEBSOCKET CONNECTION TEST FAILED")
