import os
from pathlib import Path

def create_env_file():
    """Create a .env file for Supabase connection"""
    env_path = Path('guitara/.env')
    
    # Check if file already exists
    if env_path.exists():
        print(f"WARNING: {env_path} already exists. Do you want to overwrite it? (y/n)")
        response = input().lower()
        if response != 'y':
            print("Skipping .env file creation.")
            return False
    
    # Get Supabase database connection details from user
    print("\n=== Supabase Database Configuration ===")
    print("Please provide your Supabase database connection details:")
    
    db_name = input("Database name: ").strip()
    db_user = input("Database user: ").strip()
    db_password = input("Database password: ").strip()
    db_host = input("Database host: ").strip()
    
    # Generate .env file content
    env_content = f"""# Django environment variables
DEBUG=True
SECRET_KEY=django-insecure-ic&egssnr$r%4-xjaq*0g-^8&m@&vbf2l+!0^2)1t(pdka3%5o

# Supabase Database Configuration
SUPABASE_DB_NAME={db_name}
SUPABASE_DB_USER={db_user}
SUPABASE_DB_PASSWORD={db_password}
SUPABASE_DB_HOST={db_host}

# Other settings
CORS_ALLOWED_ORIGINS=http://localhost:5173
"""
    
    # Write the .env file
    with open(env_path, 'w') as f:
        f.write(env_content)
    
    print(f"\n.env file created successfully at {env_path}")
    return True

if __name__ == "__main__":
    create_env_file()
