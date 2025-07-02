#!/usr/bin/env python3
"""
Complete Workflow Test Script
Tests the full appointment scheduling workflow including:
1. Inline client registration
2. Therapist selection (multi-select)
3. Material checking workflow
4. Payment verification workflow
5. Complete session workflow
"""

import requests
import json
import time
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://127.0.0.1:8000"
HEADERS = {
    "Content-Type": "application/json",
    "Accept": "application/json"
}

def test_api_health():
    """Test if the API is responding"""
    try:
        response = requests.get(f"{BASE_URL}/health/", timeout=5)
        print(f"✅ API Health Check: {response.status_code}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ API Health Check Failed: {e}")
        return False

def test_client_registration():
    """Test client registration functionality"""
    print("\n🧑‍💼 Testing Client Registration...")
    
    client_data = {
        "first_name": "Test",
        "last_name": "Client",
        "phone_number": "+1234567890",
        "email": "test@example.com",
        "address": "123 Test Street, Test City"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/scheduling/clients/", 
            json=client_data, 
            headers=HEADERS,
            timeout=10
        )
        print(f"Client Registration Status: {response.status_code}")
        
        if response.status_code in [200, 201]:
            client = response.json()
            print(f"✅ Client registered successfully: ID {client.get('id')}")
            return client
        else:
            print(f"❌ Client registration failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Client registration error: {e}")
        return None

def test_static_data():
    """Test fetching static data (services, therapists, etc.)"""
    print("\n📊 Testing Static Data Fetching...")
    
    endpoints = [
        ("services", "/api/registration/services/"),
        ("therapists", "/api/users/?role=therapist"),
        ("drivers", "/api/users/?role=driver"),
    ]
    
    data = {}
    
    for name, endpoint in endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}", headers=HEADERS, timeout=10)
            if response.status_code == 200:
                data[name] = response.json()
                print(f"✅ {name.capitalize()}: {len(data[name])} items")
            else:
                print(f"❌ Failed to fetch {name}: {response.status_code}")
                data[name] = []
        except Exception as e:
            print(f"❌ Error fetching {name}: {e}")
            data[name] = []
    
    return data

def test_appointment_creation(client_id, static_data):
    """Test appointment creation with materials"""
    print("\n📅 Testing Appointment Creation...")
    
    if not static_data.get("services") or not static_data.get("therapists"):
        print("❌ Cannot test appointment creation - missing static data")
        return None
    
    service_id = static_data["services"][0]["id"] if static_data["services"] else 1
    therapist_id = static_data["therapists"][0]["id"] if static_data["therapists"] else 1
    
    # Get tomorrow's date
    tomorrow = datetime.now() + timedelta(days=1)
    appointment_date = tomorrow.strftime("%Y-%m-%d")
    
    appointment_data = {
        "client": client_id,
        "services": [service_id],
        "date": appointment_date,
        "start_time": "14:00",
        "end_time": "15:00",
        "location": "123 Test Street, Test City",
        "therapists": [therapist_id],
        "notes": "Test appointment for workflow verification",
        "materials": []  # Will be populated based on service
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/api/scheduling/appointments/", 
            json=appointment_data, 
            headers=HEADERS,
            timeout=10
        )
        print(f"Appointment Creation Status: {response.status_code}")
        
        if response.status_code in [200, 201]:
            appointment = response.json()
            print(f"✅ Appointment created successfully: ID {appointment.get('id')}")
            return appointment
        else:
            print(f"❌ Appointment creation failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Appointment creation error: {e}")
        return None

def test_appointment_workflow(appointment_id):
    """Test the complete appointment workflow"""
    print(f"\n🔄 Testing Appointment Workflow (ID: {appointment_id})...")
    
    # Test status transitions
    workflow_steps = [
        ("therapist_confirmed", "Therapist confirmation"),
        ("in_progress", "Start session"),
        ("awaiting_payment", "Request payment"),
        ("payment_verified", "Payment verification"),
        ("completed", "Complete session"),
        ("pickup_requested", "Request pickup")
    ]
    
    for status, description in workflow_steps:
        try:
            response = requests.patch(
                f"{BASE_URL}/api/scheduling/appointments/{appointment_id}/",
                json={"status": status},
                headers=HEADERS,
                timeout=10
            )
            
            if response.status_code in [200, 204]:
                print(f"✅ {description}: Status updated to {status}")
            else:
                print(f"❌ {description} failed: {response.status_code}")
                
            time.sleep(0.5)  # Small delay between requests
            
        except Exception as e:
            print(f"❌ Error in {description}: {e}")

def test_materials_workflow(service_id):
    """Test materials workflow"""
    print(f"\n🧪 Testing Materials Workflow (Service ID: {service_id})...")
    
    try:
        # Get materials for service
        response = requests.get(
            f"{BASE_URL}/api/inventory/materials/?service={service_id}",
            headers=HEADERS,
            timeout=10
        )
        
        if response.status_code == 200:
            materials = response.json()
            print(f"✅ Materials for service: {len(materials)} items")
            
            # Test materials status endpoint
            response = requests.get(
                f"{BASE_URL}/api/scheduling/check-materials-status/",
                headers=HEADERS,
                timeout=10
            )
            
            if response.status_code == 200:
                status = response.json()
                print(f"✅ Materials status check: {status.get('status', 'unknown')}")
            else:
                print(f"❌ Materials status check failed: {response.status_code}")
                
        else:
            print(f"❌ Failed to fetch materials: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Materials workflow error: {e}")

def main():
    """Run the complete workflow test"""
    print("🚀 Starting Complete Workflow Test")
    print("=" * 50)
    
    # Test 1: API Health
    if not test_api_health():
        print("❌ API is not responding. Please start the backend server.")
        return
    
    # Test 2: Static Data
    static_data = test_static_data()
    
    # Test 3: Client Registration
    client = test_client_registration()
    if not client:
        print("❌ Client registration failed. Cannot continue with appointment tests.")
        return
    
    client_id = client.get("id")
    
    # Test 4: Appointment Creation
    appointment = test_appointment_creation(client_id, static_data)
    if not appointment:
        print("❌ Appointment creation failed. Cannot continue with workflow tests.")
        return
    
    appointment_id = appointment.get("id")
    service_id = static_data["services"][0]["id"] if static_data["services"] else 1
    
    # Test 5: Appointment Workflow
    test_appointment_workflow(appointment_id)
    
    # Test 6: Materials Workflow
    test_materials_workflow(service_id)
    
    print("\n" + "=" * 50)
    print("🎉 Complete Workflow Test Finished!")
    print(f"📋 Test Summary:")
    print(f"   - Client ID: {client_id}")
    print(f"   - Appointment ID: {appointment_id}")
    print(f"   - Service ID: {service_id}")
    print("\n💡 Check the browser at http://localhost:5174 to test the frontend UI!")

if __name__ == "__main__":
    main()
