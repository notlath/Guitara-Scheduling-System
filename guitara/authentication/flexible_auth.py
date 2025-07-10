"""
Flexible token authentication that supports multiple token formats.
This allows the API to work with different client implementations.
"""

import logging
from knox.auth import TokenAuthentication
from rest_framework.authentication import get_authorization_header
from rest_framework import exceptions

logger = logging.getLogger(__name__)

class FlexibleTokenAuthentication(TokenAuthentication):
    """
    Token authentication that handles both 'Token <token>' and 'Bearer <token>' formats.
    This ensures compatibility with various client implementations.
    """
    
    def authenticate(self, request):
        auth = get_authorization_header(request).split()
        
        if not auth or not auth[0] or len(auth) != 2:
            return None
        
        # Check different token formats
        token_type = auth[0].lower().decode()
        token = auth[1].decode()
        
        # Try different token formats
        if token_type not in ['token', 'bearer']:
            logger.warning(f"Unknown token type: {token_type}")
            return None

        # Log for debugging
        logger.debug(f"Authentication attempt with token format: {token_type}")
        
        # Knox expects the token as bytes, but we have it as a string
        # We need to pass the original bytes from auth[1]
        try:
            return super().authenticate_credentials(auth[1])
        except exceptions.AuthenticationFailed as e:
            logger.warning(f"Authentication failed: {str(e)}")
            raise
