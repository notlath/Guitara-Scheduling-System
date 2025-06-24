#!/usr/bin/env python3
"""
Quick Supabase connection test using your Railway environment variables
"""

import os
import sys
import time
import psycopg2
from pathlib import Path

# Set your actual Railway environment variables
os.environ["SUPABASE_DB_HOST"] = "aws-0-us-east-1.pooler.supabase.com"
os.environ["SUPABASE_DB_NAME"] = "postgres"
os.environ["SUPABASE_DB_USER"] = "postgres.cpxwkxtbjzgmjgxpheiw"
os.environ["SUPABASE_DB_PASSWORD"] = "bakitkosasabihin01@"
os.environ["SUPABASE_DB_PORT"] = "5432"

print("🔍 QUICK SUPABASE CONNECTION TEST")
print("=" * 50)


def test_direct_connection():
    """Test direct psycopg2 connection"""
    print("\n1️⃣ Direct PostgreSQL Connection Test")
    print("-" * 40)

    connection_params = {
        "host": os.environ.get("SUPABASE_DB_HOST"),
        "port": int(os.environ.get("SUPABASE_DB_PORT", "5432")),
        "database": os.environ.get("SUPABASE_DB_NAME"),
        "user": os.environ.get("SUPABASE_DB_USER"),
        "password": os.environ.get("SUPABASE_DB_PASSWORD"),
        "sslmode": "require",
        "connect_timeout": 15,
        "application_name": "railway_debug_test",
    }

    print(f"🔗 Connecting to: {connection_params['host']}:{connection_params['port']}")
    print(f"👤 User: {connection_params['user']}")
    print(f"💾 Database: {connection_params['database']}")

    try:
        start_time = time.time()

        print("⏳ Attempting connection...")
        conn = psycopg2.connect(**connection_params)

        connect_time = time.time() - start_time
        print(f"✅ Connection successful in {connect_time:.2f} seconds")

        # Test a simple query
        print("🧪 Testing query execution...")
        query_start = time.time()

        with conn.cursor() as cursor:
            cursor.execute("SELECT version(), current_database(), current_user")
            result = cursor.fetchone()

        query_time = time.time() - query_start
        print(f"✅ Query successful in {query_time:.2f} seconds")

        if result:
            version, db_name, user = result
            print(f"📊 PostgreSQL version: {version[:50]}...")
            print(f"📊 Connected to database: {db_name}")
            print(f"📊 Connected as user: {user}")

        # Test connection info
        print("🔍 Testing connection info...")
        with conn.cursor() as cursor:
            cursor.execute(
                "SELECT pg_backend_pid(), inet_server_addr(), inet_server_port()"
            )
            pid, server_addr, server_port = cursor.fetchone()
            print(f"📊 Backend PID: {pid}")
            print(f"📊 Server address: {server_addr}")
            print(f"📊 Server port: {server_port}")

        conn.close()
        print("✅ Connection closed successfully")
        return True

    except psycopg2.OperationalError as e:
        elapsed = time.time() - start_time
        print(f"❌ Connection failed after {elapsed:.2f} seconds")
        print(f"Error: {e}")
        return False
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"❌ Unexpected error after {elapsed:.2f} seconds")
        print(f"Error: {e}")
        return False


def test_with_timeout_detection():
    """Test connection with hanging detection"""
    print("\n2️⃣ Hanging Detection Test")
    print("-" * 40)

    import threading
    import signal

    result = {"completed": False, "success": False, "error": None}

    def connection_worker():
        try:
            connection_params = {
                "host": os.environ.get("SUPABASE_DB_HOST"),
                "port": int(os.environ.get("SUPABASE_DB_PORT", "5432")),
                "database": os.environ.get("SUPABASE_DB_NAME"),
                "user": os.environ.get("SUPABASE_DB_USER"),
                "password": os.environ.get("SUPABASE_DB_PASSWORD"),
                "sslmode": "require",
                "connect_timeout": 10,
            }

            conn = psycopg2.connect(**connection_params)
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1")
                cursor.fetchone()
            conn.close()

            result["completed"] = True
            result["success"] = True

        except Exception as e:
            result["completed"] = True
            result["success"] = False
            result["error"] = str(e)

    print("🔍 Starting connection test with 20-second timeout...")
    thread = threading.Thread(target=connection_worker)
    thread.daemon = True
    thread.start()

    # Wait up to 20 seconds
    thread.join(20)

    if not result["completed"]:
        print("❌ CONNECTION IS HANGING! Thread did not complete in 20 seconds")
        print("🚨 This confirms a hanging connection issue")
        return False
    elif result["success"]:
        print("✅ Connection completed successfully (no hanging)")
        return True
    else:
        print(f"❌ Connection failed: {result['error']}")
        return False


def test_multiple_connections():
    """Test multiple concurrent connections"""
    print("\n3️⃣ Multiple Connection Test")
    print("-" * 40)

    import concurrent.futures

    def single_connection(conn_id):
        try:
            connection_params = {
                "host": os.environ.get("SUPABASE_DB_HOST"),
                "port": int(os.environ.get("SUPABASE_DB_PORT", "5432")),
                "database": os.environ.get("SUPABASE_DB_NAME"),
                "user": os.environ.get("SUPABASE_DB_USER"),
                "password": os.environ.get("SUPABASE_DB_PASSWORD"),
                "sslmode": "require",
                "connect_timeout": 10,
                "application_name": f"railway_test_{conn_id}",
            }

            start_time = time.time()
            conn = psycopg2.connect(**connection_params)

            with conn.cursor() as cursor:
                cursor.execute("SELECT pg_backend_pid()")
                pid = cursor.fetchone()[0]

            conn.close()
            elapsed = time.time() - start_time

            return {"id": conn_id, "success": True, "time": elapsed, "pid": pid}

        except Exception as e:
            return {"id": conn_id, "success": False, "error": str(e)}

    print("🔍 Testing 3 concurrent connections...")

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(single_connection, i) for i in range(3)]

        try:
            results = [future.result(timeout=15) for future in futures]
        except concurrent.futures.TimeoutError:
            print("❌ Some connections timed out")
            return False

    successful = [r for r in results if r["success"]]
    failed = [r for r in results if not r["success"]]

    print(f"✅ Successful connections: {len(successful)}")
    print(f"❌ Failed connections: {len(failed)}")

    if successful:
        avg_time = sum(r["time"] for r in successful) / len(successful)
        pids = [r["pid"] for r in successful]
        print(f"📊 Average connection time: {avg_time:.2f}s")
        print(f"📊 Backend PIDs: {pids}")

    if failed:
        print("❌ Connection errors:")
        for result in failed:
            print(f"  Connection {result['id']}: {result['error']}")

    return len(successful) >= 2


def main():
    """Run all tests"""
    print("Testing Supabase connection with your Railway credentials...\n")

    tests = [
        test_direct_connection,
        test_with_timeout_detection,
        test_multiple_connections,
    ]

    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
            results.append(False)

    # Summary
    print("\n" + "=" * 50)
    print("🏁 TEST SUMMARY")
    print("=" * 50)

    passed = sum(results)
    total = len(results)
    print(f"Tests passed: {passed}/{total}")

    if passed == total:
        print("✅ Supabase connection is working normally")
        print("💡 The hanging issue might be in Django configuration")
    elif passed >= 1:
        print("⚠️ Partial success - some connection issues detected")
        print("💡 Check Supabase dashboard for connection limits")
    else:
        print("❌ All tests failed - major connection issues")
        print("🚨 Check Railway environment variables and Supabase status")

    print("\n🔧 NEXT STEPS:")
    if passed == total:
        print("  1. Check Django database settings for hanging issues")
        print("  2. Review Railway health check configuration")
        print("  3. Monitor Supabase connection count during deploys")
    else:
        print("  1. Verify Railway environment variables are correct")
        print("  2. Check Supabase dashboard for service status")
        print("  3. Try connection directly from Railway console")


if __name__ == "__main__":
    main()
