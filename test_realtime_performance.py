#!/usr/bin/env python3
"""
Real-Time WebSocket Performance Test
Tests the speed and reliability of WebSocket updates for appointment creation
"""
import asyncio
import websockets
import json
import time
import requests
from datetime import datetime, timedelta
import uuid

# Configuration
BACKEND_URL = "http://127.0.0.1:8000"
WEBSOCKET_URL = "ws://127.0.0.1:8000/ws/scheduling/appointments/"
TEST_TOKEN = None  # Will be set after login


class PerformanceTimer:
    def __init__(self, name):
        self.name = name
        self.start_time = None

    def __enter__(self):
        self.start_time = time.time()
        return self

    def __exit__(self, *args):
        duration = time.time() - self.start_time
        print(f"⏱️  {self.name}: {duration:.3f}s")


async def test_websocket_connection(token):
    """Test WebSocket connection and message receiving"""
    try:
        uri = f"{WEBSOCKET_URL}?token={token}"

        with PerformanceTimer("WebSocket Connection"):
            async with websockets.connect(uri) as websocket:
                print("✅ WebSocket connected successfully")

                # Send heartbeat
                await websocket.send(json.dumps({"type": "heartbeat"}))

                # Wait for response
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(response)
                print(f"📡 Received: {data['type']}")

                return True

    except Exception as e:
        print(f"❌ WebSocket connection failed: {e}")
        return False


def login_and_get_token():
    """Login to get authentication token"""
    login_data = {
        "username": "admin",  # Replace with your test user
        "password": "admin123",  # Replace with your test password
    }

    try:
        with PerformanceTimer("User Login"):
            response = requests.post(
                f"{BACKEND_URL}/api/authentication/login/", json=login_data
            )

        if response.status_code == 200:
            token = response.json().get("token")
            print(f"✅ Login successful, token received")
            return token
        else:
            print(f"❌ Login failed: {response.status_code} - {response.text}")
            return None

    except Exception as e:
        print(f"❌ Login error: {e}")
        return None


def create_test_appointment(token):
    """Create a test appointment and measure API response time"""
    headers = {"Authorization": f"Token {token}"}

    # Test appointment data
    appointment_data = {
        "client": 1,  # Make sure this client ID exists
        "therapists": [2],  # Make sure this therapist ID exists
        "driver": 3,  # Make sure this driver ID exists
        "date": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
        "start_time": "10:00:00",
        "end_time": "11:00:00",
        "location": "Test Location",
        "services": [1],  # Make sure this service ID exists
        "status": "pending",
    }

    try:
        with PerformanceTimer("Appointment Creation API"):
            response = requests.post(
                f"{BACKEND_URL}/api/scheduling/appointments/",
                json=appointment_data,
                headers=headers,
            )

        if response.status_code == 201:
            appointment = response.json()
            print(f"✅ Appointment created: ID {appointment['id']}")
            return appointment
        else:
            print(
                f"❌ Appointment creation failed: {response.status_code} - {response.text}"
            )
            return None

    except Exception as e:
        print(f"❌ Appointment creation error: {e}")
        return None


async def test_real_time_update(token):
    """Test real-time WebSocket updates when appointment is created"""
    try:
        uri = f"{WEBSOCKET_URL}?token={token}"

        async with websockets.connect(uri) as websocket:
            print("📡 WebSocket listener ready...")

            # Create appointment in a separate thread/process simulation
            # In a real test, you'd have another client create the appointment
            print(
                "⏳ Waiting for real-time updates (create an appointment in another tab)..."
            )

            # Listen for updates for 30 seconds
            try:
                update_received = False
                start_time = time.time()

                while time.time() - start_time < 30:
                    message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    data = json.loads(message)

                    if data.get("type") in [
                        "appointment_created",
                        "appointment_updated",
                    ]:
                        duration = time.time() - start_time
                        print(f"✅ Real-time update received in {duration:.3f}s")
                        print(f"📋 Update type: {data['type']}")
                        update_received = True
                        break

                if not update_received:
                    print("⚠️  No real-time updates received in 30 seconds")

            except asyncio.TimeoutError:
                print("⏱️  Timeout waiting for WebSocket message")

    except Exception as e:
        print(f"❌ Real-time test error: {e}")


async def concurrent_connection_test(token, num_connections=5):
    """Test multiple concurrent WebSocket connections"""
    print(f"🔗 Testing {num_connections} concurrent WebSocket connections...")

    async def single_connection(connection_id):
        try:
            uri = f"{WEBSOCKET_URL}?token={token}"
            async with websockets.connect(uri) as websocket:
                # Send heartbeat
                await websocket.send(
                    json.dumps({"type": "heartbeat", "connection_id": connection_id})
                )

                # Wait for response
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                data = json.loads(response)
                return f"Connection {connection_id}: {data['type']}"

        except Exception as e:
            return f"Connection {connection_id}: ERROR - {e}"

    with PerformanceTimer(f"{num_connections} Concurrent Connections"):
        tasks = [single_connection(i) for i in range(num_connections)]
        results = await asyncio.gather(*tasks, return_exceptions=True)

    success_count = sum(1 for r in results if "ERROR" not in str(r))
    print(f"✅ Successful connections: {success_count}/{num_connections}")

    if success_count < num_connections:
        print("❌ Some connections failed:")
        for result in results:
            if "ERROR" in str(result):
                print(f"   {result}")


def test_api_performance(token):
    """Test API endpoint performance"""
    headers = {"Authorization": f"Token {token}"}

    endpoints = [
        "/api/scheduling/appointments/",
        "/api/scheduling/clients/",
        "/api/scheduling/staff/",
        "/api/scheduling/notifications/",
    ]

    print("🔍 Testing API endpoint performance...")

    for endpoint in endpoints:
        try:
            with PerformanceTimer(f"GET {endpoint}"):
                response = requests.get(f"{BACKEND_URL}{endpoint}", headers=headers)

            if response.status_code == 200:
                data = response.json()
                count = (
                    len(data.get("results", data))
                    if isinstance(data, dict)
                    else len(data)
                )
                print(f"   ✅ {response.status_code} - {count} items")
            else:
                print(f"   ❌ {response.status_code}")

        except Exception as e:
            print(f"   ❌ Error: {e}")


async def main():
    print("🏥 Royal Care Real-Time Performance Test")
    print("=" * 50)

    # Step 1: Login
    print("\n🔐 Step 1: Authentication")
    token = login_and_get_token()
    if not token:
        print("❌ Cannot proceed without authentication")
        return

    # Step 2: Test WebSocket Connection
    print("\n📡 Step 2: WebSocket Connection Test")
    ws_success = await test_websocket_connection(token)
    if not ws_success:
        print("❌ WebSocket test failed")
        return

    # Step 3: Test API Performance
    print("\n⚡ Step 3: API Performance Test")
    test_api_performance(token)

    # Step 4: Test Concurrent Connections
    print("\n🔗 Step 4: Concurrent Connection Test")
    await concurrent_connection_test(token, 5)

    # Step 5: Test Real-Time Updates (manual)
    print("\n🔄 Step 5: Real-Time Update Test")
    print("   📝 Instructions:")
    print("   1. Keep this terminal open")
    print("   2. Open your browser to http://localhost:5173")
    print("   3. Create a new appointment")
    print("   4. Watch for real-time updates below")

    await test_real_time_update(token)

    print("\n✅ Performance test completed!")
    print("\n💡 Performance Tips:")
    print("   • API calls should be < 200ms")
    print("   • WebSocket connections should be < 100ms")
    print("   • Real-time updates should be < 500ms")


if __name__ == "__main__":
    asyncio.run(main())
