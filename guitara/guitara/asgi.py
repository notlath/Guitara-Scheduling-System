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
from scheduling.middleware import TokenAuthMiddleware
import scheduling.routing

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

# Define the ASGI application
try:
    application = ProtocolTypeRouter(
        {
            "http": django_asgi_app,
            "websocket": TokenAuthMiddleware(
                URLRouter(scheduling.routing.websocket_urlpatterns)
            ),
        }
    )
except Exception as e:
    import logging

    logger = logging.getLogger(__name__)
    logger.error(f"Error configuring ASGI application: {e}")
    traceback.print_exc(file=sys.stdout)
    raise
