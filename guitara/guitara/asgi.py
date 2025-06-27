"""
ASGI config for guitara project.
Enhanced for Railway production WebSocket support.
"""

import os
import sys
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

# Set Django settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")

print(f"[ASGI] Using Django settings: {os.environ.get('DJANGO_SETTINGS_MODULE')}")
print(f"[ASGI] Python path: {sys.path[0]}")

try:
    # Initialize Django first
    import django

    django.setup()
    print("[ASGI] ✅ Django setup completed")

    from django.core.asgi import get_asgi_application

    django_asgi_app = get_asgi_application()
    print("[ASGI] ✅ Django ASGI application created")

except Exception as e:
    logger.error(f"[ASGI] ❌ Django setup failed: {e}")
    import traceback

    traceback.print_exc()

    # Create emergency ASGI app
    async def emergency_app(scope, receive, send):
        if scope["type"] == "http":
            await send(
                {
                    "type": "http.response.start",
                    "status": 503,
                    "headers": [[b"content-type", b"application/json"]],
                }
            )
            await send(
                {
                    "type": "http.response.body",
                    "body": b'{"error": "Django setup failed", "status": "emergency"}',
                }
            )
        else:
            await send({"type": "websocket.close", "code": 1011})

    django_asgi_app = emergency_app
    print("[ASGI] ⚠️ Using emergency ASGI app")

# Try to import WebSocket components
try:
    from channels.routing import ProtocolTypeRouter, URLRouter
    from scheduling.middleware import TokenAuthMiddleware
    import scheduling.routing

    print("[ASGI] ✅ WebSocket components imported successfully")

    # Create full ASGI application with WebSocket support
    application = ProtocolTypeRouter(
        {
            "http": django_asgi_app,
            "websocket": TokenAuthMiddleware(
                URLRouter(scheduling.routing.websocket_urlpatterns)
            ),
        }
    )

    print("[ASGI] ✅ Full ASGI application with WebSocket support created")
    print(f"[ASGI] WebSocket patterns: {len(scheduling.routing.websocket_urlpatterns)}")

except ImportError as e:
    logger.warning(f"[ASGI] ⚠️ WebSocket imports failed: {e}")

    # HTTP-only fallback
    from channels.routing import ProtocolTypeRouter

    application = ProtocolTypeRouter(
        {
            "http": django_asgi_app,
        }
    )

    print("[ASGI] ⚠️ HTTP-only ASGI application (WebSocket disabled)")

except Exception as e:
    logger.error(f"[ASGI] ❌ Error creating ASGI application: {e}")
    import traceback

    traceback.print_exc()

    # Emergency fallback
    from channels.routing import ProtocolTypeRouter

    application = ProtocolTypeRouter(
        {
            "http": django_asgi_app,
        }
    )

    print("[ASGI] ⚠️ Emergency ASGI application created")

# Log final configuration
print(f"[ASGI] Final application type: {type(application)}")
print(
    f"[ASGI] Available protocols: {list(application.application_mapping.keys()) if hasattr(application, 'application_mapping') else 'Unknown'}"
)
print(f"[ASGI] Railway environment: {os.environ.get('RAILWAY_ENVIRONMENT', 'Not set')}")
print(f"[ASGI] ✅ ASGI configuration complete")
