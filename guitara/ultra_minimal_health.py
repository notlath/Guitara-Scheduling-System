"""
Ultra-minimal health check server that bypasses Django entirely
This is a last resort if Django fails to start
"""

import json
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
import os
import threading


class UltraMinimalHealthHandler(BaseHTTPRequestHandler):
    """Ultra-minimal health check handler"""

    def do_GET(self):
        """Handle GET requests"""
        if self.path in [
            "/health/",
            "/health",
            "/ping/",
            "/ping",
            "/healthcheck/",
            "/",
            "",
        ]:
            response = {
                "status": "ultra_minimal_healthy",
                "service": "guitara-scheduling-system",
                "timestamp": int(time.time()),
                "mode": "bypass_django",
                "environment": (
                    "railway" if os.environ.get("RAILWAY_ENVIRONMENT") else "other"
                ),
            }

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
            self.end_headers()
            self.wfile.write(json.dumps(response).encode())
        else:
            self.send_response(404)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"error": "Not found"}')

    def do_HEAD(self):
        """Handle HEAD requests"""
        if self.path in [
            "/health/",
            "/health",
            "/ping/",
            "/ping",
            "/healthcheck/",
            "/",
            "",
        ]:
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
        else:
            self.send_response(404)
            self.end_headers()

    def log_message(self, format, *args):
        """Custom log message"""
        print(f"[ULTRA-MINIMAL-HEALTH] {format % args}")


def start_ultra_minimal_server(port=8000):
    """Start ultra-minimal health server"""
    try:
        server = HTTPServer(("0.0.0.0", port), UltraMinimalHealthHandler)
        print(f"🚨 Ultra-minimal health server started on http://0.0.0.0:{port}")
        print("🚨 This server bypasses Django entirely")
        server.serve_forever()
    except Exception as e:
        print(f"❌ Ultra-minimal server failed: {e}")


if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8000"))
    print("🚨 Starting ultra-minimal health server (Django bypass mode)")
    start_ultra_minimal_server(port)
