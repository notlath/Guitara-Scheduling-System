import psycopg2
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get database credentials from environment variables
db_name = os.getenv('SUPABASE_DB_NAME')
db_user = os.getenv('SUPABASE_DB_USER')
db_password = os.getenv('SUPABASE_DB_PASSWORD')
db_host = os.getenv('SUPABASE_DB_HOST')

print(f"Attempting to connect to database: {db_name} on host: {db_host}")

try:
    conn = psycopg2.connect(
        dbname=db_name,
        user=db_user,
        password=db_password,
        host=db_host,
        port='5432'
    )
    print("Connected successfully!")
    
    # Test query to verify connection
    cur = conn.cursor()
    cur.execute("SELECT 1")
    result = cur.fetchone()
    print(f"Test query result: {result}")
    
    cur.close()
    conn.close()
except Exception as e:
    print(f"Error connecting to database: {e}")
