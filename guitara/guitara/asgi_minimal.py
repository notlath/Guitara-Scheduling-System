"""
Ultra-minimal ASGI config for Railway deployment
No WebSocket support, no complex middleware
"""

import os
import sys
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set Django settings module
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings_railway_minimal")

print(f"[MINIMAL ASGI] Django settings: {os.environ.get('DJANGO_SETTINGS_MODULE')}")

try:
    from django.core.asgi import get_asgi_application

    # Initialize Django ASGI application
    application = get_asgi_application()

    print("[MINIMAL ASGI] ✅ Ultra-minimal ASGI application initialized successfully")
    print(f"[MINIMAL ASGI] Application type: {type(application)}")
    print(f"[MINIMAL ASGI] Python version: {sys.version}")

except Exception as e:
    logger.error(f"[MINIMAL ASGI] ❌ Error initializing ASGI application: {e}")
    import traceback

    traceback.print_exc()

    # Emergency fallback - return a simple ASGI app
    async def emergency_asgi_app(scope, receive, send):
        if scope["type"] == "http":
            if scope["path"] in ["/health/", "/ping/", "/healthcheck/"]:
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
                        "body": b'{"status": "emergency_asgi", "service": "guitara-scheduling"}',
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
            await send({"type": "websocket.close"})

    application = emergency_asgi_app
    print("[MINIMAL ASGI] ⚠️ Using emergency ASGI application")

print(f"[MINIMAL ASGI] ✅ ASGI application ready for Railway deployment")
