#!/usr/bin/env python3
"""
Comprehensive Supabase Connection Diagnostics
Diagnoses connection hanging, timeouts, and configuration issues
"""

import os
import sys
import time
import socket
import psycopg2
import threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FutureTimeoutError

# Add guitara directory to path
guitara_path = Path(__file__).parent / "guitara"
sys.path.insert(0, str(guitara_path))

print("🔍 SUPABASE CONNECTION DIAGNOSTICS")
print("=" * 60)


# Test environment variables
def check_supabase_env_vars():
    """Check if all required Supabase environment variables are set"""
    print("\n1️⃣ ENVIRONMENT VARIABLES CHECK")
    print("-" * 40)

    required_vars = {
        "SUPABASE_DB_HOST": "Database host URL",
        "SUPABASE_DB_NAME": 'Database name (usually "postgres")',
        "SUPABASE_DB_USER": "Database user (format: postgres.xxxxx)",
        "SUPABASE_DB_PASSWORD": "Database password",
        "SUPABASE_DB_PORT": "Database port (usually 5432)",
    }

    missing_vars = []
    for var, description in required_vars.items():
        value = os.environ.get(var)
        if value:
            # Mask password for security
            if "PASSWORD" in var:
                display_value = "*" * len(value)
            else:
                display_value = value
            print(f"✅ {var}: {display_value}")
        else:
            print(f"❌ {var}: NOT SET ({description})")
            missing_vars.append(var)

    if missing_vars:
        print(f"\n⚠️ Missing variables: {', '.join(missing_vars)}")
        return False

    print("\n✅ All environment variables are set")
    return True


def test_dns_resolution():
    """Test if Supabase host can be resolved"""
    print("\n2️⃣ DNS RESOLUTION TEST")
    print("-" * 40)

    host = os.environ.get("SUPABASE_DB_HOST")
    if not host:
        print("❌ SUPABASE_DB_HOST not set")
        return False

    try:
        print(f"🔍 Resolving {host}...")
        ip_address = socket.gethostbyname(host)
        print(f"✅ DNS Resolution successful: {host} -> {ip_address}")
        return True
    except socket.gaierror as e:
        print(f"❌ DNS Resolution failed: {e}")
        return False


def test_network_connectivity(timeout=10):
    """Test if we can reach Supabase host and port"""
    print("\n3️⃣ NETWORK CONNECTIVITY TEST")
    print("-" * 40)

    host = os.environ.get("SUPABASE_DB_HOST")
    port = int(os.environ.get("SUPABASE_DB_PORT", "5432"))

    if not host:
        print("❌ SUPABASE_DB_HOST not set")
        return False

    print(f"🔍 Testing connection to {host}:{port} (timeout: {timeout}s)")

    start_time = time.time()
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((host, port))
        sock.close()

        elapsed = time.time() - start_time

        if result == 0:
            print(f"✅ Network connection successful ({elapsed:.2f}s)")
            return True
        else:
            print(f"❌ Network connection failed: Error code {result}")
            return False

    except socket.timeout:
        print(f"❌ Network connection timed out after {timeout}s")
        return False
    except Exception as e:
        print(f"❌ Network connection error: {e}")
        return False


def test_postgres_connection_simple(timeout=15):
    """Test basic PostgreSQL connection with timeout"""
    print("\n4️⃣ POSTGRESQL CONNECTION TEST (SIMPLE)")
    print("-" * 40)

    # Build connection string
    connection_params = {
        "host": os.environ.get("SUPABASE_DB_HOST"),
        "port": int(os.environ.get("SUPABASE_DB_PORT", "5432")),
        "database": os.environ.get("SUPABASE_DB_NAME"),
        "user": os.environ.get("SUPABASE_DB_USER"),
        "password": os.environ.get("SUPABASE_DB_PASSWORD"),
        "sslmode": "require",
        "connect_timeout": timeout,
    }

    print(f"🔍 Connecting to {connection_params['host']}:{connection_params['port']}")
    print(f"📊 Database: {connection_params['database']}")
    print(f"👤 User: {connection_params['user']}")
    print(f"⏱️ Timeout: {timeout}s")

    start_time = time.time()

    try:
        conn = psycopg2.connect(**connection_params)
        elapsed = time.time() - start_time

        # Test with a simple query
        with conn.cursor() as cursor:
            cursor.execute("SELECT 1 AS test")
            result = cursor.fetchone()

        conn.close()

        print(f"✅ PostgreSQL connection successful ({elapsed:.2f}s)")
        print(f"✅ Query test passed: {result}")
        return True

    except psycopg2.OperationalError as e:
        elapsed = time.time() - start_time
        print(f"❌ PostgreSQL connection failed ({elapsed:.2f}s): {e}")
        return False
    except Exception as e:
        elapsed = time.time() - start_time
        print(f"❌ Unexpected error ({elapsed:.2f}s): {e}")
        return False


def test_connection_with_threading_timeout(timeout=20):
    """Test connection using threading to detect hanging connections"""
    print("\n5️⃣ CONNECTION HANGING TEST (THREADING)")
    print("-" * 40)

    connection_result = {"success": False, "error": None, "elapsed": 0}

    def connection_worker():
        """Worker function that attempts to connect"""
        start_time = time.time()
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

            # Test query
            with conn.cursor() as cursor:
                cursor.execute("SELECT version()")
                version = cursor.fetchone()
                connection_result["version"] = version[0] if version else "Unknown"

            conn.close()
            connection_result["success"] = True
            connection_result["elapsed"] = time.time() - start_time

        except Exception as e:
            connection_result["error"] = str(e)
            connection_result["elapsed"] = time.time() - start_time

    print(f"🔍 Testing connection with {timeout}s timeout...")

    # Run connection in thread with timeout
    thread = threading.Thread(target=connection_worker)
    thread.daemon = True
    thread.start()
    thread.join(timeout)

    if thread.is_alive():
        print(f"❌ CONNECTION HANGING! Thread still alive after {timeout}s")
        print("🚨 This indicates a connection hanging issue")
        return False
    elif connection_result["success"]:
        elapsed = connection_result["elapsed"]
        version = connection_result.get("version", "Unknown")
        print(f"✅ Connection successful ({elapsed:.2f}s)")
        print(f"📊 PostgreSQL version: {version[:100]}...")
        return True
    else:
        elapsed = connection_result["elapsed"]
        error = connection_result["error"]
        print(f"❌ Connection failed ({elapsed:.2f}s): {error}")
        return False


def test_connection_pool_behavior():
    """Test multiple concurrent connections to detect pooling issues"""
    print("\n6️⃣ CONNECTION POOL BEHAVIOR TEST")
    print("-" * 40)

    def single_connection_test(conn_id):
        """Test a single connection"""
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

            start_time = time.time()
            conn = psycopg2.connect(**connection_params)

            with conn.cursor() as cursor:
                cursor.execute("SELECT pg_backend_pid()")
                pid = cursor.fetchone()[0]

            conn.close()
            elapsed = time.time() - start_time

            return {"id": conn_id, "success": True, "elapsed": elapsed, "pid": pid}

        except Exception as e:
            return {
                "id": conn_id,
                "success": False,
                "error": str(e),
                "elapsed": time.time() - start_time,
            }

    print("🔍 Testing 5 concurrent connections...")

    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(single_connection_test, i) for i in range(5)]

        try:
            results = [future.result(timeout=15) for future in futures]
        except FutureTimeoutError:
            print("❌ Some connections timed out (possible pooling issue)")
            return False

    successful = [r for r in results if r["success"]]
    failed = [r for r in results if not r["success"]]

    print(f"✅ Successful connections: {len(successful)}")
    print(f"❌ Failed connections: {len(failed)}")

    if successful:
        avg_time = sum(r["elapsed"] for r in successful) / len(successful)
        pids = [r["pid"] for r in successful]
        print(f"📊 Average connection time: {avg_time:.2f}s")
        print(f"📊 Backend PIDs: {pids}")

    if failed:
        print("❌ Failed connection errors:")
        for result in failed:
            print(f"  Connection {result['id']}: {result['error']}")

    return len(successful) >= 3  # At least 3 out of 5 should succeed


def test_django_connection():
    """Test Django's database connection"""
    print("\n7️⃣ DJANGO DATABASE CONNECTION TEST")
    print("-" * 40)

    try:
        # Set minimal Django settings
        os.environ["DJANGO_SETTINGS_MODULE"] = "guitara.settings_railway_minimal"

        import django

        django.setup()

        from django.db import connection
        from django.db.utils import OperationalError

        print("🔍 Testing Django database connection...")

        start_time = time.time()

        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()

        elapsed = time.time() - start_time

        if result and result[0] == 1:
            print(f"✅ Django database connection successful ({elapsed:.2f}s)")

            # Get connection info
            with connection.cursor() as cursor:
                cursor.execute("SELECT version()")
                version = cursor.fetchone()
                cursor.execute("SELECT current_database()")
                db_name = cursor.fetchone()

            print(f"📊 Database: {db_name[0] if db_name else 'Unknown'}")
            print(f"📊 Version: {version[0][:50] if version else 'Unknown'}...")

            return True
        else:
            print("❌ Django database connection returned unexpected result")
            return False

    except OperationalError as e:
        print(f"❌ Django database connection failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Django setup error: {e}")
        return False


def diagnose_hanging_issues():
    """Provide specific diagnosis for hanging connections"""
    print("\n8️⃣ HANGING CONNECTION DIAGNOSIS")
    print("-" * 40)

    issues_found = []

    # Check for common hanging causes
    host = os.environ.get("SUPABASE_DB_HOST", "")

    if "pooler.supabase.com" in host:
        print("🔍 Detected Supabase connection pooler")
        issues_found.append("Using connection pooler - may have timeout issues")

    if not os.environ.get("SUPABASE_DB_PORT"):
        print("⚠️ SUPABASE_DB_PORT not explicitly set")
        issues_found.append("Missing explicit port configuration")

    # Check SSL mode
    print("🔍 Checking SSL requirements...")
    print("ℹ️ Supabase requires SSL connections (sslmode=require)")

    if issues_found:
        print("\n🚨 POTENTIAL HANGING CAUSES:")
        for i, issue in enumerate(issues_found, 1):
            print(f"  {i}. {issue}")
    else:
        print("✅ No obvious configuration issues detected")


def provide_recommendations():
    """Provide recommendations based on test results"""
    print("\n9️⃣ RECOMMENDATIONS")
    print("-" * 40)

    print("🔧 SUPABASE CONNECTION BEST PRACTICES:")
    print("  1. Use connection pooling with proper timeouts")
    print("  2. Set connect_timeout to 10-15 seconds max")
    print("  3. Use sslmode='require' for Supabase")
    print("  4. Monitor connection pool exhaustion")
    print("  5. Implement connection retry logic")

    print("\n🔧 DJANGO SETTINGS RECOMMENDATIONS:")
    print("  - CONN_MAX_AGE: 600  # 10 minutes")
    print("  - OPTIONS: {'connect_timeout': 10}")
    print("  - OPTIONS: {'sslmode': 'require'}")

    print("\n🔧 RAILWAY DEPLOYMENT FIXES:")
    print("  - Use emergency mode to bypass DB during health checks")
    print("  - Implement graceful DB connection fallback")
    print("  - Add connection timeout monitoring")


def main():
    """Run all Supabase diagnostics"""
    print("Starting comprehensive Supabase diagnostics...\n")

    # Set default environment variables if not set (for testing)
    if not os.environ.get("SUPABASE_DB_HOST"):
        print("⚠️ No Supabase environment variables detected")
        print("Set the following variables before running:")
        print("  SUPABASE_DB_HOST")
        print("  SUPABASE_DB_NAME")
        print("  SUPABASE_DB_USER")
        print("  SUPABASE_DB_PASSWORD")
        print("  SUPABASE_DB_PORT")
        return

    tests = [
        check_supabase_env_vars,
        test_dns_resolution,
        test_network_connectivity,
        test_postgres_connection_simple,
        test_connection_with_threading_timeout,
        test_connection_pool_behavior,
        test_django_connection,
    ]

    results = []
    for test in tests:
        try:
            result = test()
            results.append(result)
        except Exception as e:
            print(f"❌ Test {test.__name__} crashed: {e}")
            results.append(False)

    # Final diagnosis
    diagnose_hanging_issues()
    provide_recommendations()

    # Summary
    print("\n" + "=" * 60)
    print("🏁 DIAGNOSTIC SUMMARY")
    print("=" * 60)

    passed = sum(results)
    total = len(results)
    print(f"Tests passed: {passed}/{total}")

    if passed == total:
        print("✅ All tests passed - Supabase connection is healthy")
    elif passed >= total * 0.7:
        print("⚠️ Most tests passed - Minor issues detected")
    else:
        print("❌ Multiple failures - Significant connection issues")
        print("🚨 Check Railway environment variables and Supabase settings")


if __name__ == "__main__":
    main()
