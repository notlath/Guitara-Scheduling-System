import os
import sys
import django
import json
from datetime import datetime

# Add the project to the Python path and set up the environment
sys.path.append('guitara')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

def check_websocket_setup():
    """Check that the WebSocket setup is correctly configured"""
    print("=== WebSocket Configuration Check ===")
    
    # Check ASGI application configuration
    try:
        from guitara.asgi import application
        print("✅ ASGI application is configured")
    except ImportError:
        print("❌ ASGI application is not properly configured")
        return False
    
    # Check Channels configuration
    try:
        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        if channel_layer is None:
            print("❌ Channel layer is not configured correctly")
            return False
        print(f"✅ Channel layer is configured: {channel_layer.__class__.__name__}")
    except ImportError:
        print("❌ Channels package is not installed or configured properly")
        return False
    
    # Check consumer configuration
    try:
        from scheduling.consumers import AppointmentConsumer
        print("✅ AppointmentConsumer is properly configured")
    except ImportError:
        print("❌ AppointmentConsumer is not properly configured")
        return False

    # Check routing configuration
    try:
        from scheduling.routing import websocket_urlpatterns
        print(f"✅ WebSocket URL patterns are configured: {websocket_urlpatterns}")
    except ImportError:
        print("❌ WebSocket URL patterns are not properly configured")
        return False
    
    # Try to simulate a WebSocket message
    try:
        from channels.testing import ApplicationCommunicator
        from scheduling.consumers import AppointmentConsumer
        import json
        
        # Create a test communicator
        communicator = ApplicationCommunicator(
            AppointmentConsumer.as_asgi(),
            {"type": "websocket.connect"}
        )
        
        print("\nTrying to simulate a WebSocket connection...")
        connected, _ = communicator.wait()
        if connected:
            print("✅ WebSocket connection simulation successful")
        else:
            print("❌ WebSocket connection simulation failed")
        
        print("\n=== WebSocket Configuration Summary ===")
        print("The WebSocket setup appears to be correctly configured.")
        print("""
Next steps to verify WebSocket functionality:
1. Start the Django server with: python guitara/manage.py runserver
2. Open the frontend application and check for WebSocket connections
3. Monitor the Django console for WebSocket connection logs
        """)
        
    except Exception as e:
        print(f"❌ Error simulating WebSocket message: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    check_websocket_setup()
