import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()  # Loads .env automatically

# Try to get from environment variables with various naming conventions
url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

# Debug output to help diagnose issues
if not url or not key:
    import logging

    logger = logging.getLogger(__name__)
    logger.warning("Supabase URL or key not found in environment variables")

supabase: Client = create_client(url, key)
