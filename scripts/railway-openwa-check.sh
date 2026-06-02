#!/usr/bin/env bash
# Verifica OpenWA en Railway: API, sesión y webhook hacia Vercel.
# Uso:
#   export OPENWA_API_URL=https://openwa-railway-production.up.railway.app
#   export OPENWA_API_KEY=tu-key
#   export OPENWA_SESSION_ID=tu-session-uuid
#   export WEBHOOK_URL=https://odonto-reminder.vercel.app/api/webhooks/whatsapp
#   ./scripts/railway-openwa-check.sh

set -euo pipefail

API_URL="${OPENWA_API_URL:?OPENWA_API_URL requerido}"
API_KEY="${OPENWA_API_KEY:?OPENWA_API_KEY requerido}"
SESSION_ID="${OPENWA_SESSION_ID:?OPENWA_SESSION_ID requerido}"
WEBHOOK_URL="${WEBHOOK_URL:-https://odonto-reminder.vercel.app/api/webhooks/whatsapp}"
BASE="${API_URL%/}"

echo "=== Health ==="
curl -sS "${BASE}/api/health" | python3 -m json.tool 2>/dev/null || curl -sS "${BASE}/api/health"
echo ""

echo "=== Sesión ${SESSION_ID} ==="
curl -sS -H "X-API-Key: ${API_KEY}" \
  "${BASE}/api/sessions/${SESSION_ID}" | python3 -m json.tool 2>/dev/null || true
echo ""

echo "=== Webhooks registrados ==="
curl -sS -H "X-API-Key: ${API_KEY}" \
  "${BASE}/api/sessions/${SESSION_ID}/webhooks" | python3 -m json.tool 2>/dev/null || true
echo ""

echo "=== Registrar webhook (si falta) ==="
curl -sS -X POST "${BASE}/api/sessions/${SESSION_ID}/webhooks" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${WEBHOOK_URL}\",\"events\":[\"message.received\"]}" \
  | python3 -m json.tool 2>/dev/null || true
echo ""
echo "Listo. Si status no es READY, revisa volumen en /app/data y escanea QR una vez."
