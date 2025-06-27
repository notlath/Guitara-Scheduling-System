#!/usr/bin/env python3
"""
Test URL decoding for tokens
"""
from urllib.parse import unquote

# Test token from logs
test_token = "fc5f3662b3afaa3588a2777b59d8f79624981e8b175e94c1fa6088920547d694"

# What it looks like when URL encoded
import urllib.parse

encoded_token = urllib.parse.quote(test_token)
print(f"Original token: {test_token}")
print(f"URL encoded:    {encoded_token}")
print(f"URL decoded:    {unquote(encoded_token)}")
print(f"Are they equal: {test_token == unquote(encoded_token)}")

# Test what happens with special characters (though this token doesn't have any)
print("\n--- Testing special character scenarios ---")
test_tokens = [
    "abc+def/ghi=",  # Contains URL-special characters
    "abc%20def",  # Contains URL encoded space
    "normal_token",  # Normal token
]

for token in test_tokens:
    encoded = urllib.parse.quote(token)
    decoded = unquote(encoded)
    print(
        f"Original: {token} -> Encoded: {encoded} -> Decoded: {decoded} -> Equal: {token == decoded}"
    )
