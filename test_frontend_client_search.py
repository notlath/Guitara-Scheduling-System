#!/usr/bin/env python3
"""
Test script to check what's happening with client search on the frontend
"""

import json
import requests
import os
import sys


def test_frontend_client_search():
    """Test what the frontend sees when searching for clients"""

    print("🔍 Testing Frontend Client Search Issue")
    print("=" * 50)

    # Frontend API endpoint
    frontend_url = "http://localhost:3000"
    backend_url = "http://localhost:8000/api"

    print(f"📡 Frontend URL: {frontend_url}")
    print(f"📡 Backend URL: {backend_url}")

    # Test if frontend dev server is running
    try:
        response = requests.get(frontend_url, timeout=5)
        print(f"✅ Frontend server is running (status: {response.status_code})")
    except Exception as e:
        print(f"❌ Frontend server not accessible: {e}")
        return

    # Test if backend is running
    try:
        response = requests.get(
            f"{backend_url}/registration/register/client/", timeout=5
        )
        print(f"✅ Backend server accessible (status: {response.status_code})")

        if response.status_code == 200:
            data = response.json()
            client_count = len(
                data.get("results", data) if isinstance(data, dict) else data
            )
            print(f"📊 Total clients available: {client_count}")

            # Check for Jess clients specifically
            clients = data.get("results", data) if isinstance(data, dict) else data
            jess_clients = [
                c
                for c in clients
                if "jess"
                in (c.get("first_name", "") + " " + c.get("last_name", "")).lower()
            ]
            print(f"👤 Clients with 'Jess' in name: {len(jess_clients)}")

            for client in jess_clients:
                print(
                    f"   - {client.get('first_name', '')} {client.get('last_name', '')} ({client.get('phone_number', 'No phone')})"
                )

        elif response.status_code == 401:
            print("🔒 Backend requires authentication")
        else:
            print(f"⚠️ Backend returned {response.status_code}: {response.text[:200]}")

    except Exception as e:
        print(f"❌ Backend server not accessible: {e}")
        return

    print("\n🔍 Debugging Steps:")
    print("1. Open browser to http://localhost:3000")
    print("2. Open Developer Tools (F12)")
    print("3. Go to Console tab")
    print("4. Navigate to Create Appointment")
    print("5. Click on client search field")
    print("6. Type 'jess' and watch console logs")
    print("7. Look for debug messages starting with '🔍'")

    print("\n📋 Expected Console Logs:")
    print("   🔍 LazyClientSearch - Starting fetchAllClients")
    print("   🔍 LazyClientSearch - Token status: ...")
    print("   🔍 LazyClientSearch - API response: ...")
    print("   🔍 LazyClientSearch - Normalized clients: ...")
    print("   🔍 LazyClientSearch - Filtering: ...")
    print("   🔍 SEARCH DEBUG: ...")


if __name__ == "__main__":
    test_frontend_client_search()
