#!/usr/bin/env python
"""
Test WebSocket configuration for Railway deployment
"""
import os
import sys

# Add Django project to path
sys.path.append(os.path.join(os.path.dirname(__file__), "guitara"))

# Set production settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings_production")

try:
    import django

    django.setup()

    from django.conf import settings

    print("=== DJANGO SETTINGS DEBUG ===")
    print(f'DJANGO_SETTINGS_MODULE: {os.environ.get("DJANGO_SETTINGS_MODULE")}')
    print(f'Redis URL exists: {"REDIS_URL" in os.environ}')
    print(f'Redis URL: {getattr(settings, "REDIS_URL", "NOT SET")}')
    print(f'ASGI Application: {getattr(settings, "ASGI_APPLICATION", "NOT SET")}')

    # Test Channel Layers
    print(f"\n=== CHANNEL LAYERS TEST ===")
    channel_layers_config = getattr(settings, "CHANNEL_LAYERS", "NOT SET")
    print(f"Channel Layers Config: {channel_layers_config}")

    if channel_layers_config != "NOT SET":
        backend = channel_layers_config.get("default", {}).get("BACKEND", "Unknown")
        print(f"Channel Layer Backend: {backend}")

        if "redis" in backend.lower():
            print("✅ Using Redis channel layer for WebSockets")
        else:
            print(
                "❌ NOT using Redis channel layer - WebSockets may not work on Railway"
            )

    # Test actual channel layer instantiation
    try:
        from channels.layers import get_channel_layer

        channel_layer = get_channel_layer()
        print(f"Channel layer instance: {type(channel_layer)}")

        if "redis" in str(type(channel_layer)).lower():
            print("✅ Redis channel layer successfully instantiated")
        else:
            print("❌ Redis channel layer NOT instantiated")

    except Exception as e:
        print(f"❌ Channel layer instantiation failed: {e}")

    # Test ASGI application
    print(f"\n=== ASGI APPLICATION TEST ===")
    try:
        from guitara.asgi import application

        print(f"ASGI application type: {type(application)}")

        if hasattr(application, "application_mapping"):
            protocols = list(application.application_mapping.keys())
            print(f"Supported protocols: {protocols}")

            if "websocket" in protocols:
                print("✅ WebSocket protocol supported")
            else:
                print("❌ WebSocket protocol NOT supported")
        else:
            print("❌ Cannot determine supported protocols")

    except Exception as e:
        print(f"❌ ASGI application test failed: {e}")
        import traceback

        traceback.print_exc()

    # Test Redis connection if available
    redis_url = getattr(settings, "REDIS_URL", None)
    if redis_url:
        print(f"\n=== REDIS CONNECTION TEST ===")
        try:
            import redis

            r = redis.from_url(redis_url)
            r.ping()
            print("✅ Redis connection successful")
        except ImportError:
            print("❌ Redis library not installed")
        except Exception as e:
            print(f"❌ Redis connection failed: {e}")
    else:
        print("\n❌ Redis URL not configured - WebSockets will not work on Railway")

except Exception as e:
    print(f"❌ Django setup failed: {e}")
    import traceback

    traceback.print_exc()
