from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from knox.auth import TokenAuthentication
from rest_framework.exceptions import AuthenticationFailed
from urllib.parse import parse_qs


@database_sync_to_async
def get_user(token_key):
    # Custom token authentication using Knox
    try:
        token_auth = TokenAuthentication()
        # Authenticate using raw token string (without encoding to bytes)
        user, auth_token = token_auth.authenticate_credentials(
            token_key
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

            # Parse query parameters properly
            query_params = parse_qs(query_string)

            # Extract token from query params
            token_key = ""
            if "token" in query_params and query_params["token"]:
                token_key = query_params["token"][0]  # parse_qs returns lists

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
