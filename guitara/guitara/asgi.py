"""
ASGI config for guitara project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
import traceback
import sys
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings")

# Initialize Django ASGI application early to catch any startup errors
try:
    django_asgi_app = get_asgi_application()
except Exception as e:
    import logging

    logger = logging.getLogger(__name__)
    logger.error(f"Error initializing Django ASGI application: {e}")
    traceback.print_exc(file=sys.stdout)
    raise

# Import Django models and middleware after Django is initialized
try:
    from scheduling.middleware import TokenAuthMiddleware
    import scheduling.routing

    # Define the ASGI application with WebSocket support
    application = ProtocolTypeRouter(
        {
            "http": django_asgi_app,
            "websocket": TokenAuthMiddleware(
                URLRouter(scheduling.routing.websocket_urlpatterns)
            ),
        }
    )
    print("[ASGI] ✅ Full ASGI application configured with WebSocket support")

except ImportError as e:
    import logging

    logger = logging.getLogger(__name__)
    logger.warning(f"WebSocket middleware import failed (this may be expected): {e}")
    logger.warning("⚠️ Falling back to HTTP-only ASGI application")

    # Fallback to HTTP-only ASGI application
    application = ProtocolTypeRouter(
        {
            "http": django_asgi_app,
        }
    )
    print(
        "[ASGI] ⚠️ HTTP-only ASGI application configured (WebSocket disabled due to import issues)"
    )

except Exception as e:
    import logging

    logger = logging.getLogger(__name__)
    logger.error(f"Error importing middleware or routing: {e}")
    logger.error("Full traceback:")
    traceback.print_exc(file=sys.stdout)

    # Fallback to HTTP-only ASGI application
    logger.warning("⚠️ Falling back to HTTP-only ASGI application")
    application = ProtocolTypeRouter(
        {
            "http": django_asgi_app,
        }
    )
    print(
        "[ASGI] ⚠️ HTTP-only ASGI application configured (WebSocket disabled due to errors)"
    )

print(f"[ASGI] Application type: {type(application)}")
print(
    f"[ASGI] Available protocols: {list(application.application_mapping.keys()) if hasattr(application, 'application_mapping') else 'Unknown'}"
)

# Additional startup verification
import sys

print(f"[ASGI] Python version: {sys.version}")
print(f"[ASGI] Django settings module: {os.environ.get('DJANGO_SETTINGS_MODULE')}")
print(f"[ASGI] ✅ ASGI application ready for Railway deployment")
