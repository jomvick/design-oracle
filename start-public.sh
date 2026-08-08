#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

echo "== Design Oracle — public launch (Cloudflare Tunnel) =="

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared introuvable. Installe-le :"
  echo "  https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
  echo "Ou (Linux amd64) :"
  echo "  curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -o /tmp/cloudflared && chmod +x /tmp/cloudflared && sudo mv /tmp/cloudflared /usr/local/bin/"
  exit 1
fi

echo "[1/2] Lancement du stack backend (redis + api + worker)..."
docker compose up -d redis api worker

echo "[2/2] Ouverture du tunnel HTTPS vers http://localhost:3000..."
echo "   (Lance le frontend localement avec:  cd frontend && npm run dev)"
cloudflared tunnel --url http://localhost:3000
