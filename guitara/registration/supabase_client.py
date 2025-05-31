import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()  # Loads .env automatically

# Try to get from environment variables with various naming conventions
url = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")
key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_ANON_KEY")

# Debug output to help diagnose issues
if not url or not key:
    print("Warning: Supabase URL or key not found in environment variables")
    print(f"URL found: {'Yes' if url else 'No'}")
    print(f"Key found: {'Yes' if key else 'No'}")

supabase: Client = create_client(url, key)