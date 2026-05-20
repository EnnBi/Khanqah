#!/usr/bin/env bash
set -euo pipefail

npm run build
rsync -avz --delete dist/ root@165.22.208.103:/var/www/khanqah/ \
  -e "ssh -i /Users/nadymbaba/Documents/Workspace/digiocean"
echo "Deployed."
