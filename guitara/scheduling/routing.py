from django.urls import re_path, path
from . import consumers

websocket_urlpatterns = [
    # Primary WebSocket pattern - accept query parameters for token auth
    re_path(r"^ws/scheduling/appointments/$", consumers.AppointmentConsumer.as_asgi()),
    # Alternative patterns for Railway compatibility
    path("ws/scheduling/appointments/", consumers.AppointmentConsumer.as_asgi()),
    # Fallback without trailing slash
    re_path(r"^ws/scheduling/appointments$", consumers.AppointmentConsumer.as_asgi()),
]
