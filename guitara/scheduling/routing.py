from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Changed pattern to accept query parameters
    re_path(r'ws/scheduling/appointments/', consumers.AppointmentConsumer.as_asgi()),
]
