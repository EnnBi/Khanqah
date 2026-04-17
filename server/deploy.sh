#!/bin/bash
# deploy.sh — Run on the DigitalOcean server
#
# Build workflow:
# 1. On your local machine: npx expo export --platform web
# 2. Upload dist/ to server: scp -r dist/* user@server:/var/www/khanqah/
# 3. On server: run this deploy script (or just restart nginx)
set -e

echo "=== Khanqah Live Streaming Server Setup ==="

# Install dependencies
apt-get update
apt-get install -y nginx libnginx-mod-rtmp ffmpeg curl yt-dlp

# Create directories
mkdir -p /tmp/recordings /tmp/hls /opt/khanqah
mkdir -p /var/www/khanqah

# Write main nginx.conf that includes both the RTMP block and sites-enabled
cat > /etc/nginx/nginx.conf << 'EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 768;
}

http {
    sendfile on;
    tcp_nopush on;
    types_hash_max_size 2048;
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    access_log /var/log/nginx/access.log;
    error_log /var/log/nginx/error.log;
    gzip on;
    include /etc/nginx/sites-enabled/*;
}

include /etc/nginx/nginx-rtmp.conf;
EOF

# Copy RTMP config (RTMP block only — no http block)
cp nginx-rtmp.conf /etc/nginx/nginx-rtmp.conf

# Copy web server config and enable it
cp nginx-web.conf /etc/nginx/sites-available/khanqah
ln -sf /etc/nginx/sites-available/khanqah /etc/nginx/sites-enabled/khanqah

# Remove default site if present to avoid port 80 conflict
rm -f /etc/nginx/sites-enabled/default

# Copy helper scripts
cp record-and-upload.sh /opt/khanqah/record-and-upload.sh
chmod +x /opt/khanqah/record-and-upload.sh

# Copy remote config (edit this file with your real values!)
cp config.json /opt/khanqah/config.json

# Mirror worker: copy sources, install deps, enable systemd unit.
cp mirror-worker.js /opt/khanqah/mirror-worker.js
cp mirror-jobs.js   /opt/khanqah/mirror-jobs.js
cp mirror-lib.js    /opt/khanqah/mirror-lib.js
cp package.json     /opt/khanqah/package.json
(cd /opt/khanqah && npm install --omit=dev --no-audit --no-fund)

cp khanqah-mirror.service /etc/systemd/system/khanqah-mirror.service
systemctl daemon-reload
systemctl enable --now khanqah-mirror

# Test nginx config
nginx -t

# Restart nginx
systemctl restart nginx
systemctl enable nginx

echo "=== Setup complete ==="
echo "RTMP endpoint:  rtmp://$(hostname -I | awk '{print $1}'):1935/live"
echo "HLS endpoint:   http://$(hostname -I | awk '{print $1}')/hls/stream.m3u8"
echo "Web app:        http://$(hostname -I | awk '{print $1}')"
echo ""
echo "NOTE: Upload the web build to /var/www/khanqah/ after running:"
echo "  npx expo export --platform web"
echo "  scp -r dist/* user@$(hostname -I | awk '{print $1}'):/var/www/khanqah/"
echo ""
echo "IMPORTANT: Edit the remote config with your real values:"
echo "  nano /opt/khanqah/config.json"
echo ""
echo "IMPORTANT: Set these environment variables in /opt/khanqah/.env:"
echo "  IA_ACCESS_KEY=your-internet-archive-access-key"
echo "  IA_SECRET_KEY=your-internet-archive-secret-key"
echo "  SUPABASE_URL=your-supabase-url"
echo "  SUPABASE_SERVICE_KEY=your-supabase-service-role-key"
echo "Mirror worker:   systemctl status khanqah-mirror"
echo "Mirror logs:     journalctl -u khanqah-mirror -f"
