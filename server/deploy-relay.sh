#!/usr/bin/env bash
#
# Deploy the audio-relay WebSocket service to the DO server.
# Run locally:  bash server/deploy-relay.sh
#
# Prerequisites:
#   - SSH access to root@165.22.208.103
#   - ffmpeg installed on the server (should already be there from RTMP setup)
#   - Nginx-RTMP already running on port 1935

set -euo pipefail

SERVER="root@165.22.208.103"
REMOTE_DIR="/opt/audio-relay"

echo "==> Copying audio-relay.js to server..."
ssh "$SERVER" "mkdir -p $REMOTE_DIR"
scp "$(dirname "$0")/audio-relay.js" "$SERVER:$REMOTE_DIR/audio-relay.js"

echo "==> Installing Node.js and ws package on server..."
ssh "$SERVER" bash <<'REMOTE_SCRIPT'
set -euo pipefail

# Install Node.js 20.x if not present
if ! command -v node &>/dev/null; then
  echo "Installing Node.js 20.x..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi

echo "Node.js version: $(node --version)"

cd /opt/audio-relay

# Initialise package.json if missing
if [ ! -f package.json ]; then
  npm init -y
fi

npm install ws

# Ensure ffmpeg is available
if ! command -v ffmpeg &>/dev/null; then
  echo "Installing ffmpeg..."
  apt-get update && apt-get install -y ffmpeg
fi

# Create systemd service
cat > /etc/systemd/system/audio-relay.service <<EOF
[Unit]
Description=Audio Relay WebSocket Server
After=network.target nginx.service

[Service]
Type=simple
WorkingDirectory=/opt/audio-relay
ExecStart=/usr/bin/node /opt/audio-relay/audio-relay.js
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable audio-relay
systemctl restart audio-relay

echo "Audio relay service status:"
systemctl status audio-relay --no-pager || true
REMOTE_SCRIPT

echo ""
echo "==> Checking if port 3001 is open in the firewall..."
ssh "$SERVER" "ufw allow 3001/tcp 2>/dev/null || iptables -A INPUT -p tcp --dport 3001 -j ACCEPT 2>/dev/null || echo 'Could not configure firewall — please open port 3001 manually'"

echo ""
echo "==> Done! Audio relay is running at ws://165.22.208.103:3001"
