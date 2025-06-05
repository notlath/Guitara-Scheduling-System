#!/usr/bin/env python3
"""
Complete test for the appointment notification system
"""
import asyncio
import websockets
import json
import requests
import time
from datetime import datetime, timedelta

# Configuration
API_BASE = "http://localhost:8000"
WS_BASE = "ws://localhost:8000"

async def test_notification_workflow():
    """Test the complete appointment notification workflow"""
    print("🔄 Starting appointment notification workflow test...")
    
    # Step 1: Get authentication token for therapist
    print("\n1. Getting authentication token for therapist...")
    try:
        login_response = requests.post(
            f"{API_BASE}/api/auth/login/",
            json={"username": "testtherapist", "password": "password123"}
        )
        
        if login_response.status_code == 200:
            token = login_response.json().get("token")
            user_data = login_response.json().get("user")
            print(f"✓ Authentication successful")
            print(f"  - User: {user_data.get('username')} ({user_data.get('role')})")
            print(f"  - Token: {token[:20]}...")
        else:
            print(f"✗ Login failed: {login_response.status_code} - {login_response.text}")
            return False
            
    except Exception as e:
        print(f"✗ Error getting token: {e}")
        return False
    
    # Step 2: Connect to WebSocket
    print("\n2. Connecting to WebSocket...")
    ws_uri = f"{WS_BASE}/ws/scheduling/appointments/?token={token}"
    
    try:
        async with websockets.connect(ws_uri) as websocket:
            print("✓ WebSocket connection established")
            
            # Step 3: Listen for initial data
            print("\n3. Waiting for initial data...")
            try:
                initial_message = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                initial_data = json.loads(initial_message)
                print(f"✓ Received initial data: {initial_data.get('type')}")
                if initial_data.get('appointments'):
                    print(f"  - Found {len(initial_data['appointments'])} existing appointments")
                else:
                    print("  - No existing appointments")
            except asyncio.TimeoutError:
                print("⚠ No initial data received (timeout)")
            except Exception as e:
                print(f"⚠ Error receiving initial data: {e}")
            
            # Step 4: Create test client and service (if needed)
            print("\n4. Setting up test data...")
            
            # Check if we have clients
            clients_response = requests.get(f"{API_BASE}/api/scheduling/clients/", 
                                          headers={"Authorization": f"Token {token}"})
            
            if clients_response.status_code == 200:
                clients = clients_response.json()
                if clients:
                    client_id = clients[0]['id']
                    print(f"✓ Using existing client: {clients[0]['first_name']} {clients[0]['last_name']}")
                else:
                    # Create test client
                    client_data = {
                        "first_name": "Test",
                        "last_name": "Client",
                        "phone_number": "1234567890",
                        "email": "testclient@example.com"
                    }
                    client_response = requests.post(f"{API_BASE}/api/scheduling/clients/", 
                                                  json=client_data,
                                                  headers={"Authorization": f"Token {token}"})
                    if client_response.status_code == 201:
                        client_id = client_response.json()['id']
                        print(f"✓ Created test client with ID: {client_id}")
                    else:
                        print(f"✗ Failed to create client: {client_response.text}")
                        return False
            else:
                print(f"✗ Failed to get clients: {clients_response.text}")
                return False
            
            # Check services
            services_response = requests.get(f"{API_BASE}/api/scheduling/services/",
                                           headers={"Authorization": f"Token {token}"})
            
            if services_response.status_code == 200:
                services = services_response.json()
                if services:
                    service_id = services[0]['id']
                    print(f"✓ Using service: {services[0]['name']}")
                else:
                    print("✗ No services available")
                    return False
            else:
                print(f"✗ Failed to get services: {services_response.text}")
                return False
            
            # Step 5: Create appointment and listen for WebSocket notification
            print("\n5. Creating appointment and listening for notifications...")
            
            # Calculate appointment time (tomorrow at 10:00 AM)
            tomorrow = datetime.now() + timedelta(days=1)
            appointment_date = tomorrow.strftime('%Y-%m-%d')
            appointment_time = "10:00"
            
            appointment_data = {
                "client": client_id,
                "services": [service_id],
                "therapist": user_data.get('id'),
                "date": appointment_date,
                "start_time": appointment_time,
                "location": "Test Location",
                "notes": "Test appointment for notification testing"
            }
            
            print(f"Creating appointment for {appointment_date} at {appointment_time}")
            
            # Set up WebSocket message listener
            notification_received = False
            
            async def listen_for_notifications():
                nonlocal notification_received
                try:
                    while True:
                        message = await asyncio.wait_for(websocket.recv(), timeout=30.0)
                        data = json.loads(message)
                        print(f"📨 WebSocket message: {data.get('type')}")
                        
                        if data.get('type') == 'appointment_created':
                            print("✓ Received appointment_created notification!")
                            print(f"  - Appointment ID: {data.get('appointment', {}).get('id')}")
                            notification_received = True
                            break
                        elif data.get('type') == 'appointment_notification':
                            print("✓ Received appointment_notification!")
                            print(f"  - Message: {data.get('message')}")
                            notification_received = True
                            break
                        elif data.get('type') in ['new_appointment', 'appointment_update']:
                            print("✓ Received appointment notification!")
                            notification_received = True
                            break
                            
                except asyncio.TimeoutError:
                    print("⚠ No notification received within timeout")
                except Exception as e:
                    print(f"⚠ Error listening for notifications: {e}")
            
            # Start listening in background
            listen_task = asyncio.create_task(listen_for_notifications())
            
            # Give WebSocket a moment to be ready
            await asyncio.sleep(1)
            
            # Create the appointment
            appointment_response = requests.post(
                f"{API_BASE}/api/scheduling/appointments/",
                json=appointment_data,
                headers={"Authorization": f"Token {token}"}
            )
            
            if appointment_response.status_code == 201:
                appointment_id = appointment_response.json().get('id')
                print(f"✓ Appointment created with ID: {appointment_id}")
                
                # Wait for notification
                try:
                    await asyncio.wait_for(listen_task, timeout=15.0)
                except asyncio.TimeoutError:
                    print("⚠ Timeout waiting for notification")
                
            else:
                print(f"✗ Failed to create appointment: {appointment_response.text}")
                return False
            
            # Step 6: Test appointment response
            if notification_received:
                print("\n6. Testing appointment response...")
                
                # Try to accept the appointment
                status_data = {"status": "confirmed"}
                status_response = requests.patch(
                    f"{API_BASE}/api/scheduling/appointments/{appointment_id}/status/",
                    json=status_data,
                    headers={"Authorization": f"Token {token}"}
                )
                
                if status_response.status_code == 200:
                    print("✓ Successfully updated appointment status to confirmed")
                else:
                    print(f"⚠ Failed to update appointment status: {status_response.text}")
            
            print(f"\n🎉 Test completed! Notification received: {notification_received}")
            return notification_received
            
    except Exception as e:
        print(f"✗ WebSocket connection error: {e}")
        return False

if __name__ == "__main__":
    result = asyncio.run(test_notification_workflow())
    if result:
        print("\n✅ NOTIFICATION SYSTEM TEST PASSED")
    else:
        print("\n❌ NOTIFICATION SYSTEM TEST FAILED")
