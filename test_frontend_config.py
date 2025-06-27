#!/usr/bin/env python
"""
Test frontend configuration and WebSocket connection from frontend perspective
"""
import requests
import json


def test_frontend_websocket_config():
    """Test if frontend environment variables would work correctly"""
    print("=== FRONTEND CONFIG TEST ===")

    # Test what the frontend would use in production
    production_ws_url = "wss://charismatic-appreciation-production.up.railway.app/ws/scheduling/appointments/"
    production_api_url = (
        "https://charismatic-appreciation-production.up.railway.app/api"
    )

    print(f"✅ Production WebSocket URL: {production_ws_url}")
    print(f"✅ Production API URL: {production_api_url}")

    # Test CORS preflight for WebSocket upgrade
    print(f"\n🧪 Testing CORS headers for WebSocket...")
    try:
        # Test if the backend accepts CORS requests from Vercel
        response = requests.options(
            f"{production_api_url}/auth/login/",
            headers={
                "Origin": "https://guitara-scheduling-system.vercel.app",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type,authorization",
            },
            timeout=10,
        )
        print(f"   CORS Preflight Status: {response.status_code}")
        print(f"   CORS Headers: {dict(response.headers)}")

        if "access-control-allow-origin" in response.headers:
            print("   ✅ CORS is properly configured")
        else:
            print("   ❌ CORS headers missing")

    except Exception as e:
        print(f"   ❌ CORS test failed: {e}")

    # Test if the backend API is accessible from Vercel domain
    print(f"\n🧪 Testing API accessibility...")
    try:
        response = requests.get(
            f"{production_api_url}/",
            headers={
                "Origin": "https://guitara-scheduling-system.vercel.app",
            },
            timeout=10,
        )
        print(f"   API Root Status: {response.status_code}")

        if response.status_code == 200:
            print("   ✅ API is accessible from Vercel domain")
        else:
            print(f"   ⚠️ API returned status: {response.status_code}")

    except Exception as e:
        print(f"   ❌ API test failed: {e}")

    print(f"\n💡 Key Points for Vercel Deployment:")
    print(f"   1. Environment variables should be set in Vercel dashboard:")
    print(f"      VITE_API_BASE_URL={production_api_url}")
    print(f"      VITE_WS_BASE_URL={production_ws_url}")
    print(f"   2. Frontend code should use these variables consistently")
    print(f"   3. Backend CORS must allow Vercel domain")
    print(f"   4. WebSocket upgrade requests need proper headers")


if __name__ == "__main__":
    test_frontend_websocket_config()
