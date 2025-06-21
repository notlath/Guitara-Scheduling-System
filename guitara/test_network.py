#!/usr/bin/env python
"""
Test Supabase connection directly
"""
import socket
import os
from dotenv import load_dotenv

load_dotenv()


def test_supabase_host():
    host = os.getenv("SUPABASE_DB_HOST", "aws-0-us-east-1.pooler.supabase.com")
    port = 5432

    print(f"Testing connection to {host}:{port}")

    try:
        # Test TCP connection
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)  # 10 second timeout
        result = sock.connect_ex((host, port))
        sock.close()

        if result == 0:
            print("✅ TCP connection successful!")
            print("   Network can reach Supabase host")
            return True
        else:
            print("❌ TCP connection failed!")
            print(f"   Error code: {result}")
            return False

    except socket.gaierror as e:
        print("❌ DNS resolution failed!")
        print(f"   Error: {e}")
        return False
    except Exception as e:
        print("❌ Connection test failed!")
        print(f"   Error: {e}")
        return False


if __name__ == "__main__":
    print("🔍 Testing Supabase Network Connection...")
    print("=" * 50)

    if test_supabase_host():
        print("\n✅ Network connectivity is OK")
        print("   The issue might be:")
        print("   - Wrong username/password")
        print("   - Database name incorrect")
        print("   - SSL/TLS configuration")
    else:
        print("\n❌ Network connectivity failed")
        print("   Possible issues:")
        print("   - Firewall blocking connection")
        print("   - Supabase service down")
        print("   - Wrong hostname")
        print("   - Internet connection issues")
