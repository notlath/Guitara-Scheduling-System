import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()  # Loads .env automatically

url = os.getenv("VITE_SUPABASE_URL")
key = os.getenv("VITE_SUPABASE_ANON_KEY")

supabase: Client = create_client(url, key)