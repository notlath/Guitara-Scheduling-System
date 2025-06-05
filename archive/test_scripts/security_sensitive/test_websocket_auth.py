#!/usr/bin/env python3
"""
WebSocket Authentication Test Script
Tests the WebSocket authentication middleware functionality
"""
import asyncio
import websockets
import json
import sys
import os

# Add the project path so we can import Django models
sys.path.append('/home/notlath/Downloads/Guitara-Scheduling-System/guitara')

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')

import django
django.setup()

from knox.models import AuthToken
from core.models import CustomUser
from asgiref.sync import sync_to_async

@sync_to_async
def get_test_token():
    """Get a test token for authentication"""
    try:
        # Get the active token we see in logs (d662c601)
        token_obj = AuthToken.objects.filter(token_key='d662c601').first()
        if token_obj:
            user = token_obj.user
            print(f"Found active token for user: {user.username} (ID: {user.id})")
            return 'd662c601'  # Return just the key part
        else:
            print("No active token found with key 'd662c601'")
            return None
    except Exception as e:
        print(f"Error getting token: {e}")
        return None

async def test_websocket_connection():
    """Test WebSocket connection with and without authentication"""
    
    print("=== WebSocket Authentication Test ===\n")
    
    # Get a valid token from the database
    test_token = await get_test_token()
    if not test_token:
        return
    
    # Test 1: Connection without token
    print("\n1. Testing connection without authentication...")
    try:
        uri = "ws://localhost:8000/ws/appointments/"
        async with websockets.connect(uri, timeout=5) as websocket:
            print("✓ Connected without token")
            await websocket.send(json.dumps({"type": "test", "message": "hello"}))
            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            print(f"Response: {response}")
    except Exception as e:
        print(f"✗ Connection failed: {e}")
    
    # Test 2: Connection with token in URL query parameter
    print("\n2. Testing connection with token in URL...")
    try:
        uri = f"ws://localhost:8000/ws/appointments/?token={test_token}"
        async with websockets.connect(uri, timeout=5) as websocket:
            print("✓ Connected with token in URL")
            await websocket.send(json.dumps({"type": "test", "message": "authenticated hello"}))
            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            print(f"Response: {response}")
    except Exception as e:
        print(f"✗ Connection with token failed: {e}")
    
    # Test 3: Connection with token in headers (if supported)
    print("\n3. Testing connection with token in headers...")
    try:
        uri = "ws://localhost:8000/ws/appointments/"
        headers = {"Authorization": f"Token {test_token}"}
        async with websockets.connect(uri, extra_headers=headers, timeout=5) as websocket:
            print("✓ Connected with token in headers")
            await websocket.send(json.dumps({"type": "test", "message": "header authenticated hello"}))
            response = await asyncio.wait_for(websocket.recv(), timeout=5)
            print(f"Response: {response}")
    except Exception as e:
        print(f"✗ Connection with token in headers failed: {e}")

if __name__ == "__main__":
    try:
        asyncio.run(test_websocket_connection())
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
    except Exception as e:
        print(f"Test failed: {e}")
