#!/usr/bin/env bash
# Configura webhook OpenWA → Vercel y prueba confirmación.
# Uso:
#   export OPENWA_SESSION_ID=1f5d9616-d30c-4e5d-89c8-3d99285f11bb
#   ./scripts/setup-webhook.sh

set -euo pipefail

API_URL="${OPENWA_API_URL:-https://openwa-railway-production.up.railway.app}"
API_KEY="${OPENWA_API_KEY:-dev-admin-key}"
SESSION_ID="${OPENWA_SESSION_ID:-1f5d9616-d30c-4e5d-89c8-3d99285f11bb}"
WEBHOOK_URL="${WEBHOOK_URL:-https://odonto-reminder.vercel.app/api/webhooks/whatsapp}"
TEST_PHONE="${TEST_PHONE:-584121985398}"
BASE="${API_URL%/}"

echo "=== 1) Webhooks actuales en sesión ${SESSION_ID} ==="
curl -sS -H "X-API-Key: ${API_KEY}" \
  "${BASE}/api/sessions/${SESSION_ID}/webhooks" | python3 -m json.tool 2>/dev/null || true
echo ""

echo "=== 2) Registrar webhook → ${WEBHOOK_URL} ==="
curl -sS -X POST "${BASE}/api/sessions/${SESSION_ID}/webhooks" \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"${WEBHOOK_URL}\",\"events\":[\"message.received\"]}" \
  | python3 -m json.tool 2>/dev/null || true
echo ""

echo "=== 3) Probar webhook Vercel (simula SI de Alexander) ==="
curl -sS -X POST "${WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -d "{\"event\":\"message.received\",\"sessionId\":\"${SESSION_ID}\",\"data\":{\"from\":\"${TEST_PHONE}@c.us\",\"body\":\"SI\",\"fromMe\":false,\"isGroup\":false}}" \
  | python3 -m json.tool 2>/dev/null || true
echo ""

echo "Listo. Si paso 3 dice 'Visit updated to confirmed', Vercel funciona."
echo "Si WhatsApp real no confirma, el paso 2 debe quedar registrado en OpenWA."
