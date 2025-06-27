#!/usr/bin/env python3
"""
Complete integration test for WebSocket and API functionality
This script tests:
1. API endpoints accessibility
2. WebSocket connection capability
3. Authentication flow
4. Real-time features
"""

import requests
import json
import time
import websocket
import threading
from urllib.parse import urljoin

# Configuration
BASE_URL = "http://localhost:8000"
WS_URL = "ws://localhost:8000/ws/scheduling/appointments/"
FRONTEND_URL = "http://localhost:5173"


class IntegrationTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.ws = None
        self.ws_messages = []

    def test_api_endpoints(self):
        """Test all API endpoints that were showing 404 errors"""
        print("🔍 Testing API Endpoints...")

        endpoints = [
            "/api/scheduling/appointments/",
            "/api/scheduling/appointments/rejected/",
            "/api/attendance/records/",
            "/api/attendance/today-status/",
            "/api/auth/",
            "/api/scheduling/",
            "/api/attendance/",
        ]

        for endpoint in endpoints:
            url = urljoin(BASE_URL, endpoint)
            try:
                response = self.session.head(url, timeout=5)
                status = (
                    "✅ Available"
                    if response.status_code in [200, 401, 403]
                    else f"❌ Error ({response.status_code})"
                )
                print(f"  {endpoint}: {status}")
            except Exception as e:
                print(f"  {endpoint}: ❌ Connection Error - {str(e)}")

    def test_authentication(self):
        """Test authentication flow"""
        print("\n🔐 Testing Authentication...")

        # Try to get a list of available auth endpoints
        auth_url = urljoin(BASE_URL, "/api/auth/")
        try:
            response = self.session.get(auth_url, timeout=5)
            print(f"  Auth endpoints status: {response.status_code}")
            if response.status_code == 200:
                print(f"  Available endpoints: {response.json()}")
        except Exception as e:
            print(f"  Auth test failed: {str(e)}")

    def test_websocket_connection(self):
        """Test WebSocket connection"""
        print("\n🔌 Testing WebSocket Connection...")

        def on_message(ws, message):
            print(f"  📨 Received: {message}")
            self.ws_messages.append(message)

        def on_error(ws, error):
            print(f"  ❌ WebSocket Error: {error}")

        def on_close(ws, close_status_code, close_msg):
            print(f"  🔌 WebSocket Closed: {close_status_code} - {close_msg}")

        def on_open(ws):
            print("  ✅ WebSocket Connected!")
            # Send a test message
            test_message = {"type": "ping", "timestamp": time.time()}
            ws.send(json.dumps(test_message))

        try:
            # Test basic WebSocket connection
            self.ws = websocket.WebSocketApp(
                WS_URL,
                on_open=on_open,
                on_message=on_message,
                on_error=on_error,
                on_close=on_close,
            )

            # Run WebSocket in a separate thread for a few seconds
            ws_thread = threading.Thread(target=self.ws.run_forever)
            ws_thread.daemon = True
            ws_thread.start()

            # Wait a bit to see if connection works
            time.sleep(3)

            if self.ws.sock and self.ws.sock.connected:
                print("  ✅ WebSocket connection successful!")
                self.ws.close()
            else:
                print("  ❌ WebSocket connection failed")

        except Exception as e:
            print(f"  ❌ WebSocket connection error: {str(e)}")

    def test_frontend_server(self):
        """Test if frontend server is accessible"""
        print("\n🌐 Testing Frontend Server...")

        try:
            response = self.session.get(FRONTEND_URL, timeout=5)
            if response.status_code == 200:
                print("  ✅ Frontend server is running")
            else:
                print(f"  ⚠️ Frontend server responded with: {response.status_code}")
        except Exception as e:
            print(f"  ❌ Frontend server error: {str(e)}")

    def test_cors_configuration(self):
        """Test CORS configuration"""
        print("\n🌍 Testing CORS Configuration...")

        headers = {
            "Origin": FRONTEND_URL,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "Authorization",
        }

        try:
            # Test preflight request
            response = self.session.options(
                urljoin(BASE_URL, "/api/scheduling/appointments/"),
                headers=headers,
                timeout=5,
            )

            cors_headers = {
                "Access-Control-Allow-Origin": response.headers.get(
                    "Access-Control-Allow-Origin"
                ),
                "Access-Control-Allow-Methods": response.headers.get(
                    "Access-Control-Allow-Methods"
                ),
                "Access-Control-Allow-Headers": response.headers.get(
                    "Access-Control-Allow-Headers"
                ),
            }

            print(f"  CORS Headers: {cors_headers}")

            if any(cors_headers.values()):
                print("  ✅ CORS is configured")
            else:
                print("  ⚠️ CORS might not be properly configured")

        except Exception as e:
            print(f"  ❌ CORS test error: {str(e)}")

    def run_all_tests(self):
        """Run all integration tests"""
        print("🚀 Starting Complete Integration Test\n")
        print("=" * 50)

        self.test_frontend_server()
        self.test_api_endpoints()
        self.test_authentication()
        self.test_cors_configuration()
        self.test_websocket_connection()

        print("\n" + "=" * 50)
        print("🏁 Integration Test Complete!")

        # Summary
        print("\n📋 Summary:")
        print("- Check that both servers are running")
        print("- API endpoints are accessible (401/403 is expected without auth)")
        print("- WebSocket connection should work")
        print("- CORS should be configured for frontend access")


if __name__ == "__main__":
    tester = IntegrationTester()
    tester.run_all_tests()
