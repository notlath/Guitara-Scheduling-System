import os
import sys
import django
import traceback

# Set up Django environment
sys.path.append('guitara')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

print("Checking WebSocket and ASGI configuration...")

# Check if channels is installed
try:
    import channels
    print("✓ Django Channels installed:", channels.__version__)
except ImportError:
    print("✗ Django Channels not installed")
    print("  Fix: Run 'pip install channels'")

# Check if ASGI config exists
try:
    from guitara.asgi import application
    print("✓ ASGI application found")
except ImportError:
    print("✗ ASGI configuration not found")
    print("  Expected file: guitara/asgi.py")

# Check channel layers configuration
try:
    from channels.layers import get_channel_layer
    channel_layer = get_channel_layer()
    if channel_layer:
        print(f"✓ Channel layer configured: {channel_layer.__class__.__name__}")
    else:
        print("✗ Channel layer not configured in settings.py")
except Exception as e:
    print(f"✗ Error with channel layers: {str(e)}")

# Check ASGI application structure
try:
    from guitara.asgi import application
    print("\nASGI Application Composition:")
    
    def inspect_app(app, depth=0):
        indent = "  " * depth
        app_type = app.__class__.__name__
        print(f"{indent}- {app_type}")
        
        # Check for ProtocolTypeRouter
        if hasattr(app, '_applications'):
            for protocol, child_app in app._applications.items():
                print(f"{indent}  {protocol}:")
                inspect_app(child_app, depth + 2)
        
        # Check for URLRouter
        elif hasattr(app, 'routes'):
            for i, route in enumerate(app.routes):
                try:
                    pattern = getattr(route, 'pattern', None)
                    path = str(pattern) if pattern else "Unknown"
                    handler = route.callback.__name__ if hasattr(route, 'callback') else route.__class__.__name__
                    print(f"{indent}  [Route {i+1}] {path} -> {handler}")
                except:
                    print(f"{indent}  [Route {i+1}] (Error inspecting route)")
        
        # Check for AuthMiddlewareStack
        elif hasattr(app, 'inner'):
            print(f"{indent}  Inner:")
            inspect_app(app.inner, depth + 2)
    
    inspect_app(application)
except Exception as e:
    print(f"Error inspecting ASGI application: {str(e)}")
    traceback.print_exc()

# Check for AppointmentConsumer
try:
    from scheduling.consumers import AppointmentConsumer
    print("\n✓ AppointmentConsumer found")
    
    # Check authentication methods
    has_token_auth = hasattr(AppointmentConsumer, 'get_token_from_query') or 'token' in AppointmentConsumer.connect.__code__.co_varnames
    print(f"  {'✓' if has_token_auth else '✗'} Token authentication appears to be {'implemented' if has_token_auth else 'missing'}")
except ImportError:
    print("\n✗ AppointmentConsumer not found")

# Check routing
try:
    from scheduling.routing import websocket_urlpatterns
    print("\n✓ WebSocket URL patterns found:")
    for i, route in enumerate(websocket_urlpatterns):
        try:
            path = str(route.pattern)
            print(f"  Route {i+1}: {path}")
        except:
            print(f"  Route {i+1}: (Error inspecting route)")
except ImportError:
    print("\n✗ WebSocket URL patterns not found")
    print("  Expected file: scheduling/routing.py with websocket_urlpatterns")

print("\nDone! Check output above for potential issues.")
