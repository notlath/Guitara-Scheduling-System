from supabase import create_client, Client

url = "https://cpxwkxtbjzgmjgxpheiw.supabase.co"
key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNweHdreHRianpnbWpneHBoZWl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDMyNDMwNjQsImV4cCI6MjA1ODgxOTA2NH0._tLksGoARKXHE4b-bqSlf_Eoygs3ATQClXVr5iGnsOw"
supabase: Client = create_client(url, key)