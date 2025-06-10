import os
import asyncio
from supabase import create_client, Client
from dotenv import load_dotenv
import logging

load_dotenv()  # Loads .env automatically

logger = logging.getLogger(__name__)

# Try to get from environment variables with various naming conventions
url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

# Debug output to help diagnose issues
if not url or not key:
    logger.warning("Supabase URL or key not found in environment variables")

try:
    # Create Supabase client with timeout configuration
    supabase: Client = create_client(url, key)
    logger.info("Supabase client created successfully")
except Exception as e:
    logger.error(f"Failed to create Supabase client: {e}")
    supabase = None


def safe_supabase_operation(operation, timeout=10):
    """
    Wrapper for Supabase operations with timeout handling
    """
    if not supabase:
        return None, "Supabase client not available"

    try:
        import signal

        def timeout_handler(signum, frame):
            raise TimeoutError("Supabase operation timed out")

        # Set up timeout
        signal.signal(signal.SIGALRM, timeout_handler)
        signal.alarm(timeout)

        try:
            result = operation()
            signal.alarm(0)  # Cancel the alarm
            return result, None
        except TimeoutError:
            return None, "Operation timed out - Supabase may be unreachable"
        except Exception as e:
            signal.alarm(0)  # Cancel the alarm
            return None, str(e)

    except Exception as e:
        return None, f"Error setting up timeout: {str(e)}"
