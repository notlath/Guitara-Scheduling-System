#!/usr/bin/env python3
"""
Test script to verify ALLOWED_HOSTS environment variable parsing
"""

import os


# Test the ALLOWED_HOSTS parsing logic
def test_allowed_hosts():
    print("=== Testing ALLOWED_HOSTS parsing ===")

    # Test case 1: Environment variable set
    os.environ["ALLOWED_HOSTS"] = (
        "charismatic-appreciation-production.up.railway.app,localhost,127.0.0.1"
    )

    ALLOWED_HOSTS_ENV = os.environ.get("ALLOWED_HOSTS", "")
    if ALLOWED_HOSTS_ENV:
        ALLOWED_HOSTS = [
            host.strip() for host in ALLOWED_HOSTS_ENV.split(",") if host.strip()
        ]
        print(f"✅ ALLOWED_HOSTS from env: {ALLOWED_HOSTS}")
    else:
        ALLOWED_HOSTS = ["localhost", "127.0.0.1", "testserver"]
        print(f"❌ Using default ALLOWED_HOSTS: {ALLOWED_HOSTS}")

    expected_hosts = [
        "charismatic-appreciation-production.up.railway.app",
        "localhost",
        "127.0.0.1",
    ]

    if ALLOWED_HOSTS == expected_hosts:
        print("✅ ALLOWED_HOSTS parsing works correctly!")
        return True
    else:
        print(f"❌ Expected: {expected_hosts}")
        print(f"❌ Got: {ALLOWED_HOSTS}")
        return False


if __name__ == "__main__":
    test_allowed_hosts()
