#!/usr/bin/env python3
"""
Mission Control Web Server
Serves the Mission Control dashboard with static data.
"""

import http.server
import socketserver
import os
import sys

# Server configuration
PORT = 8000
DIRECTORY = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class MissionControlHandler(http.server.SimpleHTTPRequestHandler):
    """Custom handler for serving Mission Control files."""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)
    
    def end_headers(self):
        """Add CORS headers for local development."""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()
    
    def do_GET(self):
        """Handle GET requests, serving index.html for root path."""
        if self.path == '/':
            self.path = '/src/html/index.html'
        return super().do_GET()


def main():
    """Start the Mission Control web server."""
    os.chdir(DIRECTORY)
    
    with socketserver.TCPServer(("", PORT), MissionControlHandler) as httpd:
        print(f"Mission Control Server Starting...")
        print(f"Serving from: {DIRECTORY}")
        print(f"Server running at: http://localhost:{PORT}")
        print(f"Press Ctrl+C to stop the server")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n\nShutting down server...")
            httpd.shutdown()
            sys.exit(0)


if __name__ == "__main__":
    main()
