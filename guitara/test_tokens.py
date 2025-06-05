#!/usr/bin/env python
import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'guitara.settings')
django.setup()

from knox.models import AuthToken
from knox.crypto import hash_token
import binascii

def main():
    print("=== Knox Token Analysis ===")
    tokens = AuthToken.objects.all()
    
    for token in tokens:
        print(f'Token Key: {token.token_key}')
        print(f'User ID: {token.user_id}')
        print(f'Digest (hex): {binascii.hexlify(token.digest).decode()}')
        print(f'Created: {token.created}')
        print(f'Expiry: {token.expiry}')
        print(f'Is Valid: {token.expiry is None or token.expiry > django.utils.timezone.now()}')
        print('---')
    
    # Test token validation process
    if tokens.exists():
        token = tokens.first()
        print(f"\n=== Testing Token Validation ===")
        print(f"Token key: {token.token_key}")
        print(f"Expected format: d662c601... (first 8 chars as key)")
        
        # Example of how Knox validates tokens
        test_full_token = "d662c601abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqrstuvwxyz"
        print(f"Example full token: {test_full_token}")
        print(f"Token key from full: {test_full_token[:8]}")
        
        # Show how the hash verification would work
        try:
            token_hash = hash_token(test_full_token.encode())
            print(f"Hash of example token: {binascii.hexlify(token_hash).decode()}")
        except Exception as e:
            print(f"Hash calculation error: {e}")

if __name__ == "__main__":
    main()
