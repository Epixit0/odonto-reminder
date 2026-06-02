#!/usr/bin/env bash
# Registra webhook de OpenWA hacia Vercel.
# Uso: ./scripts/openwa-webhook.sh [SESSION_ID]

set -euo pipefail

API_URL="${OPENWA_API_URL:-https://openwa-railway-production.up.railway.app}"
API_KEY="${OPENWA_API_KEY:-dev-admin-key}"
SESSION_ID="${1:-${OPENWA_SESSION_ID:-}}"
WEBHOOK_URL="${WEBHOOK_URL:-https://odonto-reminder.vercel.app/api/webhooks/whatsapp}"

if [[ -z "$SESSION_ID" ]]; then
  echo "Uso: $0 SESSION_ID" >&2
  exit 1
fi

curl -sS -X POST "${API_URL%/}/api/sessions/${SESSION_ID}/webhooks" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${WEBHOOK_URL}\",\"events\":[\"message.received\"]}" \
  | python3 -m json.tool

echo "Webhook registrado → ${WEBHOOK_URL}"
