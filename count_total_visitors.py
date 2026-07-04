import os
import glob
import gzip
from datetime import datetime

log_dir = "/var/log/nginx"
log_pattern = os.path.join(log_dir, "access.log*")

unique_ips = set()
total_requests = 0
bot_requests = 0
valid_requests = 0

min_date = None
max_date = None

# Scan all log files
log_files = glob.glob(log_pattern)
print(f"Scanning {len(log_files)} Nginx access log files in {log_dir}...")

for filepath in sorted(log_files):
    is_gzip = filepath.endswith('.gz')
    open_func = gzip.open if is_gzip else open
    mode = 'rt' if is_gzip else 'r'
    
    try:
        with open_func(filepath, mode, encoding='utf-8', errors='ignore') as f:
            for line in f:
                total_requests += 1
                line = line.strip()
                if not line:
                    continue
                
                lower_line = line.lower()
                is_bot = any(x in lower_line for x in ['bot', 'spider', 'crawler', 'yandex', 'baidu', 'googlebot', 'bingbot'])
                if is_bot:
                    bot_requests += 1
                    continue
                
                parts = line.split()
                if len(parts) < 4:
                    continue
                
                ip = parts[0]
                time_part = parts[3].lstrip('[')
                
                try:
                    log_time = datetime.strptime(time_part, "%d/%b/%Y:%H:%M:%S")
                    if min_date is None or log_time < min_date:
                        min_date = log_time
                    if max_date is None or log_time > max_date:
                        max_date = log_time
                except:
                    pass
                
                unique_ips.add(ip)
                valid_requests += 1
    except Exception as e:
        print(f"Error/Warning reading {filepath}: {e}")

print("\n=== LAPORAN PENGUNJUNG KARIRENERGI ===")
if min_date and max_date:
    print(f"Rentang Waktu Log : {min_date.strftime('%d %B %Y %H:%M:%S')} s.d {max_date.strftime('%d %B %Y %H:%M:%S')}")
else:
    print("Rentang Waktu Log : Tidak terdeteksi")
print(f"Total Request     : {total_requests:,}")
print(f"Request Bot/Spam  : {bot_requests:,}")
print(f"Request Valid     : {valid_requests:,}")
print(f"Total IP Unik (Pengunjung Riil) : {len(unique_ips):,}")
print("=======================================")
