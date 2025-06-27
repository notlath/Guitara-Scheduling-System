from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from knox.auth import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed


@database_sync_to_async
def get_user(token_key):
    # Custom token authentication using Knox
    try:
        token_auth = TokenAuthentication()
        # Knox authenticate_credentials expects bytes, not string
        token_bytes = (
            token_key.encode("utf-8") if isinstance(token_key, str) else token_key
        )
        user, auth_token = token_auth.authenticate_credentials(
            token_bytes
        )  # Authentication successful
        return user
    except AuthenticationFailed as e:
        print(f"[MIDDLEWARE] Authentication failed for token: {e}")
        return AnonymousUser()
    except Exception as e:
        print(f"[MIDDLEWARE] Unexpected error during authentication: {e}")
        return AnonymousUser()


class TokenAuthMiddleware:
    """
    Custom middleware for Channels that authenticates using Knox tokens
    """

    def __init__(self, inner):
        self.inner = inner
        print("[MIDDLEWARE] TokenAuthMiddleware initialized")

    async def __call__(self, scope, receive, send):
        try:
            # Get query parameters
            query_string = scope.get("query_string", b"").decode()
            print(f"[MIDDLEWARE] WebSocket connection attempt, query: {query_string}")

            # Safely parse query parameters
            query_params = {}
            for param in query_string.split("&"):
                if param and "=" in param:
                    key, value = param.split("=", 1)
                    # URL decode the value (especially important for tokens)
                    try:
                        from urllib.parse import unquote

                        query_params[key] = unquote(value)
                    except:
                        query_params[key] = value

            # Extract token from query params
            token_key = query_params.get("token", "")

            if token_key:
                # Get user from token
                scope["user"] = await get_user(token_key)
                if scope["user"].is_authenticated:
                    print(
                        f"[MIDDLEWARE] ✅ User authenticated: {scope['user'].id} ({scope['user'].role})"
                    )
                else:
                    print("[MIDDLEWARE] ❌ Token provided but authentication failed")
            else:
                scope["user"] = AnonymousUser()
                print("[MIDDLEWARE] ⚠️ No token provided, using AnonymousUser")

            return await self.inner(scope, receive, send)
        except Exception as e:
            print(f"[MIDDLEWARE] ❌ Error in TokenAuthMiddleware: {e}")
            scope["user"] = AnonymousUser()
            return await self.inner(scope, receive, send)
