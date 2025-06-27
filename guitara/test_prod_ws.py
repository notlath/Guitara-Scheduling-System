import os
import django

# Set production settings
os.environ["DJANGO_SETTINGS_MODULE"] = "guitara.settings_production"
os.environ["REDIS_URL"] = (
    "redis://default:OZAurZgciODtPejgVDYSJHQtODNQDTBj@trolley.proxy.rlwy.net:12062"
)

django.setup()

from django.conf import settings

print("=== PRODUCTION SETTINGS TEST ===")
print(f'REDIS_URL: {getattr(settings, "REDIS_URL", "NOT SET")}')
print(f'CHANNEL_LAYERS: {getattr(settings, "CHANNEL_LAYERS", "NOT SET")}')

from channels.layers import get_channel_layer

channel_layer = get_channel_layer()
print(f"Channel layer: {type(channel_layer)}")

if "redis" in str(type(channel_layer)).lower():
    print("✅ Using Redis channel layer")
else:
    print("❌ NOT using Redis channel layer")
