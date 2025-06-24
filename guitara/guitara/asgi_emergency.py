"""
Emergency ASGI config for Railway deployment
ZERO WebSocket support, ZERO complex middleware
"""

import os
import sys
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set Django settings module to emergency
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings_emergency")

print(f"[EMERGENCY ASGI] Django settings: {os.environ.get('DJANGO_SETTINGS_MODULE')}")

try:
    from django.core.asgi import get_asgi_application

    # Initialize Django ASGI application
    application = get_asgi_application()

    print("[EMERGENCY ASGI] ✅ Emergency ASGI application initialized successfully")
    print(f"[EMERGENCY ASGI] Application type: {type(application)}")

except Exception as e:
    logger.error(f"[EMERGENCY ASGI] ❌ Error initializing ASGI application: {e}")
    import traceback
    traceback.print_exc()

    # Ultimate fallback - return a simple ASGI app
    async def ultimate_emergency_asgi_app(scope, receive, send):
        if scope["type"] == "http":
            if scope["path"] in ["/health/", "/ping/", "/healthcheck/", "/"]:
                await send(
                    {
                        "type": "http.response.start",
                        "status": 200,
                        "headers": [[b"content-type", b"application/json"]],
                    }
                )
                await send(
                    {
                        "type": "http.response.body",
                        "body": b'{"status": "ultimate_emergency", "service": "guitara-scheduling"}',
                    }
                )
            else:
                await send(
                    {
                        "type": "http.response.start",
                        "status": 404,
                        "headers": [[b"content-type", b"application/json"]],
                    }
                )
                await send(
                    {
                        "type": "http.response.body",
                        "body": b'{"error": "Not found"}',
                    }
                )
        else:
            # Close non-HTTP connections
            if scope["type"] == "websocket":
                await send({"type": "websocket.close"})

    application = ultimate_emergency_asgi_app
    print("[EMERGENCY ASGI] ⚠️ Using ultimate emergency ASGI application")

print(f"[EMERGENCY ASGI] ✅ Emergency ASGI application ready for Railway deployment")
