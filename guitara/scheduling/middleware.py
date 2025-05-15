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
        user, auth_token = token_auth.authenticate_credentials(token_key.encode('utf-8'))
        return user
    except AuthenticationFailed:
        return AnonymousUser()

class TokenAuthMiddleware:
    """
    Custom middleware for Channels that authenticates using Knox tokens
    """
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        # Get query parameters
        query_string = scope.get('query_string', b'').decode()
        query_params = dict(param.split('=') for param in query_string.split('&') if param)
        
        # Extract token from query params
        token_key = query_params.get('token', '')
        
        if token_key:
            # Get user from token
            scope['user'] = await get_user(token_key)
        else:
            scope['user'] = AnonymousUser()
        
        return await self.inner(scope, receive, send)
