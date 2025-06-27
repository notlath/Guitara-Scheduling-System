from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from knox.auth import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed


@database_sync_to_async
def get_user(token_key):
    # Custom token authentication using Knox
    try:
        print(f"[MIDDLEWARE] Attempting authentication with token: {token_key[:20]}...")
        print(f"[MIDDLEWARE] Token type: {type(token_key)}, length: {len(token_key)}")

        token_auth = TokenAuthentication()
        # Knox authenticate_credentials expects bytes, not string
        token_bytes = (
            token_key.encode("utf-8") if isinstance(token_key, str) else token_key
        )

        print(
            f"[MIDDLEWARE] Token bytes type: {type(token_bytes)}, length: {len(token_bytes)}"
        )

        user, auth_token = token_auth.authenticate_credentials(
            token_bytes
        )  # Authentication successful

        print(
            f"[MIDDLEWARE] ✅ Authentication successful for user: {user.id} ({user.username})"
        )
        return user
    except AuthenticationFailed as e:
        print(f"[MIDDLEWARE] ❌ Authentication failed for token: {e}")
        print(f"[MIDDLEWARE] Failed token was: {token_key}")
        return AnonymousUser()
    except Exception as e:
        print(f"[MIDDLEWARE] ❌ Unexpected error during authentication: {e}")
        print(f"[MIDDLEWARE] Error token was: {token_key}")
        import traceback

        traceback.print_exc()
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
            print(
                f"[MIDDLEWARE] Extracted token: {token_key[:20] if token_key else 'None'}..."
            )
            print(f"[MIDDLEWARE] All query params: {query_params}")

            if token_key:
                # Get user from token
                scope["user"] = await get_user(token_key)
                if scope["user"].is_authenticated:
                    print(
                        f"[MIDDLEWARE] ✅ User authenticated: {scope['user'].id} ({scope['user'].role})"
                    )
                else:
                    print("[MIDDLEWARE] ❌ Token provided but authentication failed")
                    print(
                        f"[MIDDLEWARE] User object: {scope['user']}, is_authenticated: {scope['user'].is_authenticated}"
                    )
            else:
                scope["user"] = AnonymousUser()
                print("[MIDDLEWARE] ⚠️ No token provided, using AnonymousUser")

            return await self.inner(scope, receive, send)
        except Exception as e:
            print(f"[MIDDLEWARE] ❌ Error in TokenAuthMiddleware: {e}")
            scope["user"] = AnonymousUser()
            return await self.inner(scope, receive, send)
