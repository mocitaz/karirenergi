import http.server
import json
import subprocess
from datetime import datetime, timedelta
import os

class VisitorHandler(http.server.BaseHTTPRequestHandler):
    # Disable request logging to keep terminal output clean
    def log_message(self, format, *args):
        return

    def do_GET(self):
        if self.path == '/active-visitors':
            count = 1
            log_path = '/var/log/nginx/access.log'
            if os.path.exists(log_path):
                try:
                    # Read last 1000 lines of Nginx access.log
                    log_data = subprocess.check_output(['tail', '-n', '1000', log_path]).decode('utf-8')
                    unique_ips = set()
                    now = datetime.now()
                    five_minutes_ago = now - timedelta(minutes=5)
                    
                    for line in log_data.splitlines():
                        if not line.strip() or 'bot' in line.lower() or 'spider' in line.lower() or 'crawler' in line.lower() or 'yandex' in line.lower() or 'baidu' in line.lower():
                            continue
                        parts = line.split()
                        if len(parts) < 4:
                            continue
                        ip = parts[0]
                        time_part = parts[3].lstrip('[')
                        try:
                            # Parse Nginx timestamp, e.g. 03/Jul/2026:15:47:05
                            log_time = datetime.strptime(time_part, "%d/%b/%Y:%H:%M:%S")
                            if log_time >= five_minutes_ago:
                                unique_ips.add(ip)
                        except:
                            pass
                    
                    count = len(unique_ips)
                    if count == 0:
                        count = 1
                except Exception as e:
                    pass
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"active_visitors": count}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == '__main__':
    # Listen on localhost port 5000
    server = http.server.HTTPServer(('127.0.0.1', 5000), VisitorHandler)
    print("Starting active visitors API on 127.0.0.1:5000...")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
