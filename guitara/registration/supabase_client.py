import os
import asyncio
import signal
import threading
from supabase import create_client, Client
from dotenv import load_dotenv
import logging

load_dotenv()  # Loads .env automatically

logger = logging.getLogger(__name__)


# Try to get from environment variables with various naming conventions
def get_supabase_client():
    url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
    # Prioritize service key for write operations, fallback to anon key
    key = (
        os.getenv("SUPABASE_SERVICE_KEY")
        or os.getenv("SUPABASE_KEY")
        or os.getenv("VITE_SUPABASE_ANON_KEY")
    )

    # Debug output to help diagnose issues
    if not url or not key:
        logger.warning("Supabase URL or key not found in environment variables")
        logger.warning(
            f"Available env vars: {[k for k in os.environ.keys() if 'SUPABASE' in k]}"
        )
        return None

    # Log which key type we're using (without exposing the actual key)
    if os.getenv("SUPABASE_SERVICE_KEY"):
        logger.info("Using Supabase service key for operations")
    elif os.getenv("SUPABASE_KEY"):
        logger.info("Using Supabase key for operations")
    else:
        logger.warning(
            "Using anonymous key - may have limited permissions for write operations"
        )

    try:
        return create_client(url, key)
    except Exception as e:
        logger.error(f"Failed to create Supabase client: {e}")
        return None


def safe_supabase_operation(operation, timeout=10):
    """
    Execute a Supabase operation with timeout handling
    """
    result = None
    error = None
    exception = None

    def target():
        nonlocal result, error, exception
        try:
            result = operation()
        except Exception as e:
            exception = e

    thread = threading.Thread(target=target)
    thread.daemon = True
    thread.start()
    thread.join(timeout)

    if thread.is_alive():
        logger.error(f"Supabase operation timed out after {timeout} seconds")
        return None, f"Operation timed out after {timeout} seconds"

    if exception:
        logger.error(f"Supabase operation failed: {exception}")
        return None, str(exception)

    return result, error


# Create a global instance for backward compatibility
supabase = None


def init_supabase():
    global supabase
    if supabase is None:
        supabase = get_supabase_client()
    return supabase


# Usage: from .supabase_client import get_supabase_client, safe_supabase_operation
# supabase = get_supabase_client()  # Call this inside your view or function
