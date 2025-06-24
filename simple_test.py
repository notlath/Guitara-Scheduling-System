import os
import sys
from pathlib import Path

# Add the guitara directory to the path
guitara_dir = Path(__file__).parent / "guitara"
sys.path.insert(0, str(guitara_dir))
os.chdir(guitara_dir)

# Set environment
os.environ["DJANGO_SETTINGS_MODULE"] = "guitara.settings_production"
os.environ["ALLOWED_HOSTS"] = (
    "charismatic-appreciation-production.up.railway.app,localhost,127.0.0.1,testserver"
)

# Django setup
import django

django.setup()

# Test
from django.test import Client

client = Client()

print("Testing /health/...")
response = client.get("/health/")
print(f"Status: {response.status_code}")
if response.status_code == 200:
    print(f"Response: {response.json()}")

print("\nTesting /healthcheck/...")
response = client.get("/healthcheck/")
print(f"Status: {response.status_code}")
if response.status_code == 200:
    print(f"Response: {response.json()}")

print("\nTesting /ping/...")
response = client.get("/ping/")
print(f"Status: {response.status_code}")
if response.status_code == 200:
    print(f"Response: {response.json()}")

print("\n✅ Health checks completed!")
