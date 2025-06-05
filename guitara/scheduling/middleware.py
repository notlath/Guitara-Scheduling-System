from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from knox.models import AuthToken
from knox.crypto import hash_token
from rest_framework.exceptions import AuthenticationFailed
from django.utils import timezone

@database_sync_to_async
def get_user(token_key):
    # Custom token authentication using Knox models directly
    try:
        print(f"Authenticating token: {token_key[:10]}...")
        
        # Knox tokens are stored with token_key as first 8 characters
        # and the full token is used for verification
        if len(token_key) < 8:
            print("Token too short")
            return AnonymousUser()
        
        # Get the first 8 characters as the token_key for database lookup
        digest_part = token_key[:8]
        
        # Look up the token in the database using token_key
        try:
            auth_token = AuthToken.objects.select_related('user').get(
                token_key=digest_part,
                expiry__gt=timezone.now()            )
            
            # Verify the full token matches using Knox's hash_token function
            # Knox hash_token expects bytes, so encode the string token
            expected_digest = hash_token(token_key.encode('utf-8'))
            
            if auth_token.digest == expected_digest:
                user = auth_token.user
                print(f"Authentication successful for user: {user.username}")
                return user
            else:
                print(f"Token digest mismatch: expected {expected_digest}, got {auth_token.digest}")
                return AnonymousUser()
                
        except AuthToken.DoesNotExist:
            print(f"Token not found in database: {digest_part}")
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
