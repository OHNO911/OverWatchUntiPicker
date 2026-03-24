#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-4173}"
HOST="${2:-127.0.0.1}"
URL="http://${HOST}:${PORT}/"

echo "[OWアンチくん] プレビューサーバーを起動します"
echo "URL: ${URL}"
echo "停止するには Ctrl+C を押してください。"

if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "${PORT}" --bind "${HOST}"
else
  echo "python3 が見つからないため起動できません。"
  exit 1
fi
