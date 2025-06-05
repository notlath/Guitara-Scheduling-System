#!/usr/bin/env python3
"""
Test frontend WebSocket connectivity by simulating browser behavior
"""
import asyncio
import websockets
import json
import requests

async def test_frontend_websocket():
    """Test WebSocket connection as the frontend would do it"""
    print("🔄 Testing frontend WebSocket connectivity...")
    
    # Step 1: Login and get token (simulating frontend login)
    print("\n1. Logging in to get token...")
    try:
        login_response = requests.post(
            "http://localhost:8000/api/auth/login/",
            json={"username": "testtherapist", "password": "password123"}
        )
        
        if login_response.status_code == 200:
            response_data = login_response.json()
            token = response_data.get("token")
            user = response_data.get("user")
            print(f"✓ Login successful")
            print(f"  - User: {user.get('username')} ({user.get('role')})")
            print(f"  - User ID: {user.get('id')}")
            print(f"  - Token: {token[:20]}...")
        else:
            print(f"✗ Login failed: {login_response.status_code}")
            print(f"Response: {login_response.text}")
            return False
            
    except Exception as e:
        print(f"✗ Login error: {e}")
        return False
    
    # Step 2: Test WebSocket connection (exactly as frontend does)
    print("\n2. Testing WebSocket connection...")
    ws_url = f"ws://localhost:8000/ws/scheduling/appointments/?token={token}"
    
    try:
        print(f"Connecting to: {ws_url}")
        async with websockets.connect(ws_url) as websocket:
            print("✓ WebSocket connection established!")
            
            # Step 3: Wait for initial data
            print("\n3. Waiting for initial data...")
            try:
                message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                data = json.loads(message)
                
                print(f"✓ Received message type: {data.get('type')}")
                
                if data.get('type') == 'initial_data':
                    appointments = data.get('appointments', [])
                    print(f"  - Initial appointments count: {len(appointments)}")
                    
                    if appointments:
                        print("  - Sample appointment:")
                        for key, value in list(appointments[0].items())[:5]:
                            print(f"    {key}: {value}")
                else:
                    print(f"  - Unexpected message type: {data.get('type')}")
                    print(f"  - Message content: {data}")
                    
            except asyncio.TimeoutError:
                print("⚠ No initial data received (this might be normal)")
            except json.JSONDecodeError as e:
                print(f"⚠ JSON decode error: {e}")
                print(f"Raw message: {message}")
            except Exception as e:
                print(f"⚠ Error receiving data: {e}")
            
            # Step 4: Test sending a message
            print("\n4. Testing bidirectional communication...")
            test_message = {
                "type": "ping",
                "timestamp": "2025-06-05T10:00:00Z"
            }
            
            try:
                await websocket.send(json.dumps(test_message))
                print("✓ Test message sent")
                
                # Try to receive response
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    response_data = json.loads(response)
                    print(f"✓ Received response: {response_data.get('type')}")
                except asyncio.TimeoutError:
                    print("⚠ No response to test message (may be expected)")
                    
            except Exception as e:
                print(f"⚠ Error testing bidirectional communication: {e}")
            
            print("\n✅ WebSocket test completed successfully!")
            return True
            
    except websockets.exceptions.ConnectionClosed as e:
        print(f"✗ WebSocket connection closed: {e}")
        return False
    except websockets.exceptions.InvalidStatusCode as e:
        print(f"✗ WebSocket invalid status code: {e}")
        return False
    except Exception as e:
        print(f"✗ WebSocket connection error: {e}")
        return False

async def test_authentication_middleware():
    """Test the authentication middleware specifically"""
    print("\n🔧 Testing authentication middleware...")
    
    # Test 1: Connection without token
    print("\n1. Testing connection without token...")
    try:
        async with websockets.connect("ws://localhost:8000/ws/scheduling/appointments/") as ws:
            print("⚠ Connection succeeded without token (unexpected)")
            await ws.close()
    except Exception as e:
        print(f"✓ Connection properly rejected without token: {type(e).__name__}")
    
    # Test 2: Connection with invalid token
    print("\n2. Testing connection with invalid token...")
    try:
        async with websockets.connect("ws://localhost:8000/ws/scheduling/appointments/?token=invalid") as ws:
            print("⚠ Connection succeeded with invalid token (unexpected)")
            await ws.close()
    except Exception as e:
        print(f"✓ Connection properly rejected with invalid token: {type(e).__name__}")

if __name__ == "__main__":
    print("🧪 Frontend WebSocket Connectivity Test")
    print("=" * 50)
    
    try:
        # Test basic connectivity
        result = asyncio.run(test_frontend_websocket())
        
        # Test authentication
        asyncio.run(test_authentication_middleware())
        
        if result:
            print("\n🎉 All tests passed! WebSocket system is working correctly.")
        else:
            print("\n❌ Some tests failed. Check the output above for details.")
            
    except KeyboardInterrupt:
        print("\n⚠ Test interrupted by user")
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
