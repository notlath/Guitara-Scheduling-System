#!/usr/bin/env python3
"""
Enhanced WebSocket debugging script for Guitara Scheduling System
Tests WebSocket connection with detailed error reporting and multiple authentication methods
"""

import asyncio
import websockets
import json
import sys
import ssl
import traceback
from urllib.parse import urlencode

# Known working token from logs
TOKEN = "d662c601"

async def test_websocket_connection():
    """Test WebSocket connection with comprehensive debugging"""
    
    # Test configurations
    test_configs = [
        {
            "name": "Token in URL query parameter",
            "url": f"ws://127.0.0.1:8000/ws/scheduling/appointments/?token={TOKEN}",
            "headers": {}
        },
        {
            "name": "Token in Authorization header",
            "url": "ws://127.0.0.1:8000/ws/scheduling/appointments/",
            "headers": {"Authorization": f"Token {TOKEN}"}
        },
        {
            "name": "Knox-style token in header",
            "url": "ws://127.0.0.1:8000/ws/scheduling/appointments/",
            "headers": {"Authorization": f"Knox {TOKEN}"}
        }
    ]
    
    for config in test_configs:
        print(f"\n{'='*60}")
        print(f"Testing: {config['name']}")
        print(f"URL: {config['url']}")
        print(f"Headers: {config['headers']}")
        print(f"{'='*60}")
        
        try:
            # Create connection with timeout
            print("Attempting to connect...")
            
            # Create connection with custom headers
            if config["headers"]:
                # Use additional_headers for newer websockets versions
                async with websockets.connect(
                    config["url"],
                    additional_headers=config["headers"],
                    ping_interval=20,
                    ping_timeout=10,
                    close_timeout=10,
                    open_timeout=15
                ) as websocket:
                    await handle_websocket_connection(websocket, config)
            else:
                async with websockets.connect(
                    config["url"],
                    ping_interval=20,
                    ping_timeout=10,
                    close_timeout=10,
                    open_timeout=15
                ) as websocket:
                    await handle_websocket_connection(websocket, config)
                    
async def handle_websocket_connection(websocket, config):
    """Handle the websocket connection logic"""
                print("✅ WebSocket connection established!")
                print(f"Connection state: {websocket.state}")
                print(f"Local address: {websocket.local_address}")
                print(f"Remote address: {websocket.remote_address}")
                
                # Send a test message
                test_message = {
                    "type": "test_message",
                    "message": "Hello from test client",
                    "timestamp": str(asyncio.get_event_loop().time())
                }
                
                print(f"\nSending test message: {test_message}")
                await websocket.send(json.dumps(test_message))
                
                # Wait for response with timeout
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=10)
                    print(f"✅ Received response: {response}")
                    
                    # Try to parse as JSON
                    try:
                        response_data = json.loads(response)
                        print(f"📄 Parsed response: {json.dumps(response_data, indent=2)}")
                    except json.JSONDecodeError:
                        print(f"📄 Raw response: {response}")
                        
                except asyncio.TimeoutError:
                    print("⏰ No response received within 10 seconds")
                
                # Send another message to test bidirectional communication
                echo_message = {
                    "type": "echo_test",
                    "data": "Testing echo functionality"
                }
                
                print(f"\nSending echo test: {echo_message}")
                await websocket.send(json.dumps(echo_message))
                
                # Wait for potential echo or acknowledgment
                try:
                    echo_response = await asyncio.wait_for(websocket.recv(), timeout=5)
                    print(f"✅ Echo response: {echo_response}")
                except asyncio.TimeoutError:
                    print("⏰ No echo response received")
                
                print(f"\n✅ Test completed successfully for: {config['name']}")
                
                # Keep connection open briefly to see if we receive any broadcasts
                print("\nListening for incoming messages for 5 seconds...")
                try:
                    incoming = await asyncio.wait_for(websocket.recv(), timeout=5)
                    print(f"📨 Incoming message: {incoming}")
                except asyncio.TimeoutError:
                    print("No incoming messages received")
                
                break  # Exit after first successful connection
                
        except websockets.exceptions.ConnectionClosedError as e:
            print(f"❌ Connection closed: {e}")
            print(f"Close code: {e.code}")
            print(f"Close reason: {e.reason}")
            
        except websockets.exceptions.InvalidStatusCode as e:
            print(f"❌ Invalid status code: {e}")
            print(f"Status code: {e.status_code}")
            
        except websockets.exceptions.InvalidURI as e:
            print(f"❌ Invalid URI: {e}")
            
        except OSError as e:
            print(f"❌ OS Error: {e}")
            if "Connection refused" in str(e):
                print("💡 Server might not be running or WebSocket not configured")
            elif "Name or service not known" in str(e):
                print("💡 DNS resolution failed - check hostname")
                
        except asyncio.TimeoutError:
            print("❌ Connection timeout - server not responding")
            print("💡 Check if WebSocket endpoint is properly configured")
            
        except Exception as e:
            print(f"❌ Unexpected error: {e}")
            print(f"Error type: {type(e).__name__}")
            print("Stack trace:")
            traceback.print_exc()
        
        print(f"\nTest failed for: {config['name']}")
        print("Trying next configuration...\n")
    
    print("\n" + "="*60)
    print("All WebSocket tests completed")
    print("="*60)

def test_basic_connection():
    """Test basic socket connection to verify server is reachable"""
    import socket
    
    print("\n" + "="*60)
    print("Testing basic TCP connection...")
    print("="*60)
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(5)
        result = sock.connect_ex(('127.0.0.1', 8000))
        sock.close()
        
        if result == 0:
            print("✅ TCP connection to 127.0.0.1:8000 successful")
            print("💡 Server is reachable")
        else:
            print(f"❌ TCP connection failed with code: {result}")
            print("💡 Server might not be running on port 8000")
            
    except Exception as e:
        print(f"❌ TCP connection test failed: {e}")

async def main():
    """Main function to run all tests"""
    print("WebSocket Debug Tool for Guitara Scheduling System")
    print("Testing WebSocket authentication with Knox tokens")
    
    # Test basic connectivity first
    test_basic_connection()
    
    # Test WebSocket connections
    await test_websocket_connection()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠️ Interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Script failed: {e}")
        traceback.print_exc()
