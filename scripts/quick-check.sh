#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-4173}"
HOST="${2:-127.0.0.1}"
URL="http://${HOST}:${PORT}/index.html"

status=$(curl -s -o /tmp/ow_anti_index.html -w "%{http_code}" "${URL}")
if [[ "${status}" != "200" ]]; then
  echo "NG: ${URL} (status=${status})"
  exit 1
fi

if ! rg -q "OWアンチくん" /tmp/ow_anti_index.html; then
  echo "NG: タイトル文字列を確認できませんでした"
  exit 1
fi

if ! rg -q "hero-grid" /tmp/ow_anti_index.html; then
  echo "NG: hero-grid 要素を確認できませんでした"
  exit 1
fi

if ! rg -q "map-select" /tmp/ow_anti_index.html; then
  echo "NG: map-select 要素を確認できませんでした"
  exit 1
fi

echo "OK: HTML の配信と主要要素の存在を確認しました (${URL})"
