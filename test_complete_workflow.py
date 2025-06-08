# Complete Service Flow Integration Test Script
# Tests the end-to-end workflow for Royal Care Home Service

import sys
import os
import time
import requests
import json
from datetime import datetime, timedelta

# API Configuration
BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://127.0.0.1:5173"

class WorkflowTester:
    def __init__(self):
        self.headers = {"Content-Type": "application/json"}
        self.tokens = {}
        self.test_appointment_id = None
        
    def login_user(self, role, credentials):
        """Login and get authentication token"""
        response = requests.post(
            f"{BACKEND_URL}/api/auth/login/",
            json=credentials,
            headers=self.headers
        )
        if response.status_code == 200:
            data = response.json()
            self.tokens[role] = data.get('token')
            print(f"✅ {role.capitalize()} login successful")
            return True
        else:
            print(f"❌ {role.capitalize()} login failed: {response.text}")
            return False
    
    def get_auth_headers(self, role):
        """Get headers with authentication token"""
        headers = self.headers.copy()
        if role in self.tokens:
            headers['Authorization'] = f'Token {self.tokens[role]}'
        return headers
    
    def test_appointment_creation(self):
        """Test creating a new appointment"""
        print("\n🔄 Testing appointment creation...")
        
        # Create a multi-therapist appointment
        appointment_data = {
            "client": 1,  # Assuming client ID 1 exists
            "therapists": [1, 2],  # Multi-therapist appointment
            "services": [1],  # Assuming service ID 1 exists
            "date": (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d"),
            "start_time": "14:00:00",
            "end_time": "16:00:00",
            "location": "123 Test St, Quezon City",
            "notes": "Test appointment for workflow integration",
            "requires_car": True,
            "carpooling_enabled": True
        }
        
        response = requests.post(
            f"{BACKEND_URL}/api/appointments/",
            json=appointment_data,
            headers=self.get_auth_headers('operator')
        )
        
        if response.status_code == 201:
            self.test_appointment_id = response.json()['id']
            print(f"✅ Appointment created successfully (ID: {self.test_appointment_id})")
            return True
        else:
            print(f"❌ Appointment creation failed: {response.text}")
            return False
    
    def test_therapist_acceptance(self):
        """Test therapist accepting appointment"""
        print("\n🔄 Testing therapist acceptance...")
        
        # First therapist accepts
        response = requests.post(
            f"{BACKEND_URL}/api/appointments/{self.test_appointment_id}/accept/",
            headers=self.get_auth_headers('therapist1')
        )
        
        if response.status_code == 200:
            print("✅ First therapist accepted appointment")
        else:
            print(f"❌ First therapist acceptance failed: {response.text}")
            return False
        
        # Second therapist accepts
        response = requests.post(
            f"{BACKEND_URL}/api/appointments/{self.test_appointment_id}/accept/",
            headers=self.get_auth_headers('therapist2')
        )
        
        if response.status_code == 200:
            print("✅ Second therapist accepted appointment")
            return True
        else:
            print(f"❌ Second therapist acceptance failed: {response.text}")
            return False
    
    def test_driver_assignment(self):
        """Test driver accepting appointment"""
        print("\n🔄 Testing driver acceptance...")
        
        response = requests.post(
            f"{BACKEND_URL}/api/appointments/{self.test_appointment_id}/accept/",
            headers=self.get_auth_headers('driver')
        )
        
        if response.status_code == 200:
            print("✅ Driver accepted appointment")
            return True
        else:
            print(f"❌ Driver acceptance failed: {response.text}")
            return False
    
    def test_workflow_steps(self):
        """Test each step of the service workflow"""
        workflow_steps = [
            ('therapist_confirm', 'therapist1', 'Therapist confirmation'),
            ('driver_confirm', 'driver', 'Driver confirmation'), 
            ('start_journey', 'driver', 'Journey start'),
            ('mark_arrived', 'driver', 'Mark arrived'),
            ('start_session', 'therapist1', 'Session start'),
            ('request_payment', 'therapist1', 'Payment request'),
            ('complete_appointment', 'therapist1', 'Session completion'),
            ('request_pickup', 'therapist1', 'Pickup request')
        ]
        
        for step, role, description in workflow_steps:
            print(f"\n🔄 Testing {description}...")
            
            if step == 'request_pickup':
                # Special handling for pickup request
                payload = {
                    'pickup_urgency': 'normal',
                    'pickup_notes': 'Test pickup request'
                }
            else:
                payload = {}
            
            response = requests.post(
                f"{BACKEND_URL}/api/appointments/{self.test_appointment_id}/{step}/",
                json=payload,
                headers=self.get_auth_headers(role)
            )
            
            if response.status_code == 200:
                print(f"✅ {description} successful")
                time.sleep(1)  # Brief pause between steps
            else:
                print(f"❌ {description} failed: {response.text}")
                return False
        
        return True
    
    def test_appointment_status(self):
        """Check final appointment status"""
        print("\n🔄 Checking final appointment status...")
        
        response = requests.get(
            f"{BACKEND_URL}/api/appointments/{self.test_appointment_id}/",
            headers=self.get_auth_headers('operator')
        )
        
        if response.status_code == 200:
            appointment = response.json()
            print(f"✅ Final status: {appointment['status']}")
            print(f"   Pickup requested: {appointment.get('pickup_requested', False)}")
            print(f"   Pickup urgency: {appointment.get('pickup_urgency', 'None')}")
            return True
        else:
            print(f"❌ Status check failed: {response.text}")
            return False
    
    def test_frontend_connectivity(self):
        """Test frontend connectivity"""
        print("\n🔄 Testing frontend connectivity...")
        
        try:
            response = requests.get(FRONTEND_URL, timeout=5)
            if response.status_code == 200:
                print("✅ Frontend is accessible")
                return True
        except:
            pass
        
        print("❌ Frontend not accessible - may need to be started manually")
        return False
    
    def run_full_test(self):
        """Run complete workflow test"""
        print("🚀 Starting Complete Service Flow Integration Test")
        print("=" * 60)
        
        # Test credentials (adjust based on your test data)
        test_users = {
            'operator': {'username': 'operator1', 'password': 'password123'},
            'therapist1': {'username': 'therapist1', 'password': 'password123'},
            'therapist2': {'username': 'therapist2', 'password': 'password123'},
            'driver': {'username': 'driver1', 'password': 'password123'}
        }
        
        # Login all users
        print("\n📋 Step 1: User Authentication")
        for role, credentials in test_users.items():
            if not self.login_user(role, credentials):
                print(f"❌ Test failed: Could not login {role}")
                return False
        
        # Test frontend connectivity
        print("\n📋 Step 2: Frontend Connectivity")
        self.test_frontend_connectivity()
        
        # Create appointment
        print("\n📋 Step 3: Appointment Creation")
        if not self.test_appointment_creation():
            print("❌ Test failed: Could not create appointment")
            return False
        
        # Test acceptance process
        print("\n📋 Step 4: Acceptance Process")
        if not self.test_therapist_acceptance():
            print("❌ Test failed: Therapist acceptance issue")
            return False
        
        if not self.test_driver_assignment():
            print("❌ Test failed: Driver assignment issue")
            return False
        
        # Test workflow steps
        print("\n📋 Step 5: Service Workflow")
        if not self.test_workflow_steps():
            print("❌ Test failed: Workflow step issue")
            return False
        
        # Final status check
        print("\n📋 Step 6: Final Status")
        self.test_appointment_status()
        
        print("\n🎉 Complete Service Flow Test Completed!")
        print("=" * 60)
        print("\n✅ All workflow steps executed successfully!")
        print(f"   Test appointment ID: {self.test_appointment_id}")
        print("   Frontend dashboards should now show updated statuses")
        print("   Check operator dashboard for pickup request management")
        
        return True

def main():
    """Main test execution"""
    print("Royal Care Service Flow Integration Test")
    print("This script tests the complete end-to-end workflow")
    print("Make sure both backend and frontend servers are running\n")
    
    # Check if servers are running
    backend_check = requests.get(f"{BACKEND_URL}/api/", timeout=5)
    if backend_check.status_code != 200:
        print("❌ Backend server not accessible. Please start it with:")
        print("   cd guitara && python manage.py runserver")
        return False
    
    tester = WorkflowTester()
    success = tester.run_full_test()
    
    if success:
        print("\n🚀 Next Steps:")
        print("1. Open browser to http://127.0.0.1:5173")
        print("2. Login as different roles to see dashboard updates")
        print("3. Test real-time status updates and UI interactions")
        print("4. Verify pickup request notifications in operator dashboard")
    
    return success

if __name__ == "__main__":
    try:
        main()
    except requests.exceptions.ConnectionError:
        print("❌ Connection error: Please ensure backend server is running")
        print("   Start with: cd guitara && python manage.py runserver")
    except KeyboardInterrupt:
        print("\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
