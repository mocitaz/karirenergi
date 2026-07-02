#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "=== Starting KarirEnergi Deployment ==="

# Check requirements
echo "[1/4] Checking environment..."
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install it on the server first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "ERROR: npm is not installed. Please install it on the server first."
    exit 1
fi

if ! command -v nginx &> /dev/null; then
    echo "WARNING: Nginx is not installed. You will need to install and configure a web server."
fi

# Pull latest code
echo "[2/4] Pulling latest code from GitHub..."
git pull origin main

# Build the web application
echo "[3/4] Installing dependencies & building production assets..."
cd web-app
npm install
npm run build
echo "Build complete. Output directory is: $(pwd)/dist"

# Print Nginx Configuration Block
echo "[4/4] Completed successfully!"
echo ""
echo "=== Nginx Configuration Instructions ==="
echo "Please create a configuration file at '/etc/nginx/sites-available/karirenergi.online' with the following content:"
echo "--------------------------------------------------------"
cat <<EOF
server {
    listen 80;
    server_name karirenergi.online www.karirenergi.online;

    root $(pwd)/dist;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(?:css|js|jpg|jpeg|gif|png|ico|cur|gz|svg|svgz|mp4|ogg|ogv|webm|htc)$ {
        expires 1M;
        access_log off;
        add_header Cache-Control "public";
    }
}
EOF
echo "--------------------------------------------------------"
echo "After creating the file, run:"
echo "  sudo ln -sf /etc/nginx/sites-available/karirenergi.online /etc/nginx/sites-enabled/"
echo "  sudo nginx -t"
echo "  sudo systemctl restart nginx"
echo ""
echo "=== Deployment Finished ==="
