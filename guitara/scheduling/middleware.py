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
        # Authenticate using raw token string (without encoding to bytes)
        user, auth_token = token_auth.authenticate_credentials(token_key)
        print(f"Authentication successful for user: {user.username}")
        return user
    except AuthenticationFailed as e:
        print(f"Authentication failed: {str(e)}")
        return AnonymousUser()
    except Exception as e:
        print(f"Unexpected error during authentication: {str(e)}")
        return AnonymousUser()

class TokenAuthMiddleware:
    """
    Custom middleware for Channels that authenticates using Knox tokens
    """
    def __init__(self, inner):
        self.inner = inner
        
    async def __call__(self, scope, receive, send):
        try:
            # Get query parameters
            query_string = scope.get('query_string', b'').decode()
            print(f"Query string: {query_string}")
            
            # Safely parse query parameters
            query_params = {}
            for param in query_string.split('&'):
                if param and '=' in param:
                    key, value = param.split('=', 1)
                    query_params[key] = value
            
            # Extract token from query params
            token_key = query_params.get('token', '')
            print(f"Token found: {bool(token_key)}")
            
            if token_key:
                # Get user from token
                scope['user'] = await get_user(token_key)
                print(f"User authenticated: {scope['user'].is_authenticated}")
            else:
                scope['user'] = AnonymousUser()
                print("No token provided, using AnonymousUser")
            
            return await self.inner(scope, receive, send)
        except Exception as e:
            print(f"Error in TokenAuthMiddleware: {str(e)}")
            scope['user'] = AnonymousUser()
            return await self.inner(scope, receive, send)
