#!/usr/bin/env python3
"""
Robust startup script for Railway deployment
Handles database connection issues gracefully
"""

import os
import sys
import time
import logging
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

# Configure logging first
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(asctime)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger(__name__)

# Set Django settings - try minimal first, then regular
try:
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings_railway_minimal")
    logger.info("🧪 Attempting startup with minimal Railway settings")
except Exception as e:
    logger.warning(f"Minimal settings failed, trying regular Railway settings: {e}")
    os.environ["DJANGO_SETTINGS_MODULE"] = "guitara.settings_railway"

def wait_for_database(max_retries=10, retry_delay=5):
    """
    Wait for database to be available before starting the application
    """
    import django
    django.setup()
    
    from django.db import connection
    from django.db.utils import OperationalError
    
    for attempt in range(max_retries):
        try:
            logger.info(f"Attempting database connection (attempt {attempt + 1}/{max_retries})")
            
            # Test database connection
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                
            logger.info("✅ Database connection successful!")
            return True
            
        except OperationalError as e:
            logger.warning(f"Database connection failed: {e}")
            if attempt < max_retries - 1:
                logger.info(f"Retrying in {retry_delay} seconds...")
                time.sleep(retry_delay)
            else:
                logger.error("❌ Database connection failed after all retries")
                return False
        except Exception as e:
            logger.error(f"Unexpected error during database connection: {e}")
            return False
    
    return False

def run_migrations():
    """
    Run Django migrations with error handling
    """
    import django
    from django.core.management import execute_from_command_line
    
    try:
        logger.info("Running Django migrations...")
        execute_from_command_line(['manage.py', 'migrate', '--noinput'])
        logger.info("✅ Migrations completed successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Migration failed: {e}")
        return False

def collect_static():
    """
    Collect static files with error handling
    """
    import django
    from django.core.management import execute_from_command_line
    
    try:
        logger.info("Collecting static files...")
        execute_from_command_line(['manage.py', 'collectstatic', '--noinput'])
        logger.info("✅ Static files collected successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Static file collection failed: {e}")
        return False

def start_server():
    """
    Start the ASGI server
    """
    import subprocess
    
    try:
        port = os.environ.get('PORT', '8000')
        logger.info(f"Starting Daphne server on port {port}")
        
        # Start Daphne ASGI server
        cmd = [
            'daphne',
            '-b', '0.0.0.0',
            '-p', port,
            'guitara.asgi:application'
        ]
        
        logger.info(f"Executing: {' '.join(cmd)}")
        subprocess.run(cmd, check=True)
        
    except subprocess.CalledProcessError as e:
        logger.error(f"❌ Server startup failed: {e}")
        sys.exit(1)
    except Exception as e:
        logger.error(f"❌ Unexpected error starting server: {e}")
        sys.exit(1)

def main():
    """
    Main startup sequence
    """
    logger.info("🚀 Starting Guitara Scheduling System")
    logger.info(f"Django settings: {os.environ.get('DJANGO_SETTINGS_MODULE')}")
    logger.info(f"Port: {os.environ.get('PORT', '8000')}")
    
    # Step 1: Wait for database
    if not wait_for_database():
        logger.error("❌ Database is not available. Starting server anyway...")
        # Continue without database - let Django handle gracefully
    
    # Step 2: Run migrations (skip if database not available)
    try:
        run_migrations()
    except Exception as e:
        logger.warning(f"Migration skipped due to error: {e}")
    
    # Step 3: Collect static files
    try:
        collect_static()
    except Exception as e:
        logger.warning(f"Static file collection skipped due to error: {e}")
    
    # Step 4: Start server
    logger.info("🌟 Starting ASGI server...")
    start_server()

if __name__ == "__main__":
    main()
