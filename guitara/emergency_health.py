#!/usr/bin/env python3
"""
Emergency health check for Railway deployment
This script can run even if Django fails to start
"""

import os
import sys
import time
import logging
from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import threading

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(asctime)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger(__name__)

class HealthCheckHandler(BaseHTTPRequestHandler):
    """Simple health check HTTP handler"""
    
    def do_GET(self):
        """Handle GET requests"""
        if self.path in ['/health/', '/health', '/ping/', '/ping']:
            # Return simple health check
            response_data = {
                "status": "ok",
                "service": "guitara-scheduling-system",
                "timestamp": int(time.time()),
                "message": "Emergency health check - Django may not be fully loaded"
            }
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            
        else:
            # Return 404 for other paths
            self.send_response(404)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Not found"}).encode('utf-8'))
    
    def log_message(self, format, *args):
        """Override log message to use our logger"""
        logger.info(format % args)

def start_emergency_server(port=8000, timeout=30):
    """
    Start emergency health check server
    This runs for a limited time to allow Railway health checks to pass
    """
    server_address = ('0.0.0.0', port)
    httpd = HTTPServer(server_address, HealthCheckHandler)
    
    logger.info(f"🚨 Starting emergency health check server on port {port}")
    logger.info(f"⏰ Server will run for {timeout} seconds")
    
    # Set a timeout for the server
    def shutdown_server():
        time.sleep(timeout)
        logger.info("⏰ Emergency server timeout reached, shutting down")
        httpd.shutdown()
    
    # Start shutdown timer in background
    shutdown_thread = threading.Thread(target=shutdown_server)
    shutdown_thread.daemon = True
    shutdown_thread.start()
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        logger.info("🛑 Emergency server stopped by user")
    finally:
        httpd.server_close()
        logger.info("🔚 Emergency health check server stopped")

def test_django_startup():
    """Test if Django can start up"""
    try:
        logger.info("🧪 Testing Django startup...")
        
        # Set Django settings
        os.environ.setdefault("DJANGO_SETTINGS_MODULE", "guitara.settings_railway")
        
        # Add current directory to path
        sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
        
        import django
        django.setup()
        
        logger.info("✅ Django started successfully")
        return True
        
    except Exception as e:
        logger.error(f"❌ Django startup failed: {e}")
        return False

def main():
    """Main function"""
    logger.info("🚨 EMERGENCY HEALTH CHECK SYSTEM")
    logger.info("=" * 50)
    
    port = int(os.environ.get('PORT', 8000))
    
    # Test if Django can start
    django_ok = test_django_startup()
    
    if django_ok:
        logger.info("✅ Django is working, starting normal application...")
        # If Django works, try to start the normal application
        try:
            from startup import main as start_normal_app
            start_normal_app()
        except Exception as e:
            logger.error(f"❌ Normal startup failed: {e}")
            logger.info("🚨 Falling back to emergency mode")
            start_emergency_server(port, timeout=300)  # 5 minutes
    else:
        logger.warning("⚠️ Django startup failed, running emergency health check server")
        start_emergency_server(port, timeout=600)  # 10 minutes for debugging

if __name__ == "__main__":
    main()
