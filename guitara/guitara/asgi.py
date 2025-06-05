"""
ASGI config for guitara project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.1/howto/deployment/asgi/
"""

import os
import traceback
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')

# Initialize Django ASGI application first
from django.core.asgi import get_asgi_application
django_asgi_app = get_asgi_application()

# Now import Channels components
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from scheduling.middleware import TokenAuthMiddleware
import scheduling.routing

# Define the ASGI application
application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": TokenAuthMiddleware(
        URLRouter(
            scheduling.routing.websocket_urlpatterns
        )
    ),
})
