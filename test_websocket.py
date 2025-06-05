#!/usr/bin/env python3
"""
WebSocket test script to verify real-time appointment updates
"""
import asyncio
import websockets
import json
import sys

# Token obtained from our authentication
TOKEN = "e52d5c5d05632f68d19b56e87d1b1f652af040f23a72ba80a4a182733977df3b"
WEBSOCKET_URL = f"ws://localhost:8000/ws/scheduling/appointments/?token={TOKEN}"

async def test_websocket_connection():
    """Test WebSocket connection and listen for messages"""
    try:
        print(f"Connecting to WebSocket: {WEBSOCKET_URL}")
        
        async with websockets.connect(WEBSOCKET_URL) as websocket:
            print("✅ WebSocket connection established successfully!")
            print("Listening for appointment updates...")
            print("Press Ctrl+C to stop\n")
            
            # Send a test message to see if the connection is working
            test_message = {
                "type": "test_connection",
                "message": "Testing WebSocket from Python client"
            }
            await websocket.send(json.dumps(test_message))
            print(f"📤 Sent test message: {test_message}")
            
            # Listen for incoming messages
            message_count = 0
            async for message in websocket:
                message_count += 1
                try:
                    data = json.loads(message)
                    print(f"📨 Message {message_count}: {data}")
                    
                    # Handle different message types
                    if data.get('type') == 'appointment_update':
                        print(f"   ↳ Appointment updated: ID {data.get('appointment_id')}")
                    elif data.get('type') == 'appointment_create':
                        print(f"   ↳ New appointment created: ID {data.get('appointment_id')}")
                    elif data.get('type') == 'appointment_delete':
                        print(f"   ↳ Appointment deleted: ID {data.get('appointment_id')}")
                    else:
                        print(f"   ↳ Unknown message type: {data.get('type')}")
                        
                except json.JSONDecodeError:
                    print(f"📨 Message {message_count}: {message} (not JSON)")
                    
    except websockets.exceptions.ConnectionClosedError as e:
        print(f"❌ WebSocket connection closed: {e}")
        return False
    except websockets.exceptions.InvalidURI as e:
        print(f"❌ Invalid WebSocket URI: {e}")
        return False
    except websockets.exceptions.WebSocketException as e:
        print(f"❌ WebSocket error: {e}")
        return False
    except ConnectionRefusedError:
        print("❌ Connection refused. Is the Django server running?")
        return False
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return False
    
    return True

async def test_websocket_authentication():
    """Test WebSocket authentication with invalid token"""
    print("Testing WebSocket authentication...")
    
    # Test with invalid token
    invalid_url = "ws://localhost:8000/ws/scheduling/appointments/?token=invalid_token"
    try:
        print(f"Trying invalid token: {invalid_url}")
        async with websockets.connect(invalid_url) as websocket:
            print("⚠️  Warning: Connected with invalid token (should have failed)")
            await websocket.close()
    except websockets.exceptions.ConnectionClosedError:
        print("✅ Authentication properly rejected invalid token")
    except Exception as e:
        print(f"❌ Unexpected error with invalid token: {e}")

async def test_websocket():
    # Get authentication token first
    import requests
    
    try:
        login_response = requests.post(
            "http://localhost:8000/api/auth/login/",
            json={"username": "test_user", "password": "testpass123"}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            print(f"✓ Got authentication token: {token[:20]}...")
        else:
            print(f"✗ Login failed: {login_response.status_code} - {login_response.text}")
            return
            
    except Exception as e:
        print(f"✗ Error getting token: {e}")
        return
    
    uri = f"ws://localhost:8000/ws/scheduling/appointments/?token={token}"
    
if __name__ == "__main__":
    print("=== WebSocket Test for Guitara Scheduling System ===\n")
    
    # First test authentication
    asyncio.run(test_websocket_authentication())
    print()
    
    # Then test actual connection
    try:
        asyncio.run(test_websocket_connection())
    except KeyboardInterrupt:
        print("\n👋 WebSocket test stopped by user")
    except Exception as e:
        print(f"❌ Test failed: {e}")
        sys.exit(1)
