import os
import sys
import django
from getpass import getpass
import requests
import json

# Add the project to the Python path and set up the environment
sys.path.append('guitara')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

def create_superuser():
    """Create a Django superuser"""
    from django.contrib.auth import get_user_model
    User = get_user_model()
    
    print("\n=== Create Superuser ===")
    
    # Check if a superuser already exists
    if User.objects.filter(is_superuser=True).exists():
        print("A superuser already exists. Do you want to create another one? (y/n)")
        response = input().lower()
        if response != 'y':
            print("Skipping superuser creation.")
            return False
    
    # Get superuser information
    username = input("Username: ").strip()
    email = input("Email: ").strip()
    password = getpass("Password: ")
    password2 = getpass("Password (again): ")
    
    if password != password2:
        print("Passwords don't match. Please try again.")
        return False
    
    try:
        user = User.objects.create_superuser(username=username, email=email, password=password)
        print(f"Superuser '{username}' created successfully!")
        return True
    except Exception as e:
        print(f"Error creating superuser: {str(e)}")
        return False

def test_api_endpoints():
    """Test API endpoints to verify they are working correctly"""
    print("\n=== Testing API Endpoints ===")
    
    # Start Django development server in a separate process
    import subprocess
    from threading import Thread
    import time
    
    server_process = subprocess.Popen(
        ["python", "guitara/manage.py", "runserver", "--noreload"],
        stdout=subprocess.PIPE, 
        stderr=subprocess.PIPE
    )
    
    print("Starting Django development server...")
    time.sleep(5)  # Give the server time to start
    
    # Define endpoints to test
    endpoints = [
        "/api/services/",
        "/admin/",
        "/api/auth/register/",
        "/api/auth/login/",
    ]
    
    print("Testing endpoints:")
    for endpoint in endpoints:
        try:
            response = requests.get(f"http://localhost:8000{endpoint}")
            status = response.status_code
            status_text = "✅ OK" if status in [200, 301, 302, 403] else "❌ Failed"
            print(f"  {endpoint} - Status: {status} - {status_text}")
        except Exception as e:
            print(f"  {endpoint} - ❌ Error: {str(e)}")
    
    # Stop the server
    server_process.terminate()
    print("\nServer stopped.")
    
    print("\n=== API Test Complete ===")
    print("""
If all endpoints returned status codes in [200, 301, 302, 403], 
your API is working correctly. Some endpoints may return 403 (Forbidden)
because they require authentication.
    """)

if __name__ == "__main__":
    print("=== Django Management Helper ===")
    print("1. Create Superuser")
    print("2. Test API Endpoints")
    print("3. Both")
    print("0. Exit")
    
    choice = input("\nEnter your choice (0-3): ")
    
    if choice == '1':
        create_superuser()
    elif choice == '2':
        test_api_endpoints()
    elif choice == '3':
        create_superuser()
        test_api_endpoints()
    else:
        print("Exiting...")
        sys.exit(0)
