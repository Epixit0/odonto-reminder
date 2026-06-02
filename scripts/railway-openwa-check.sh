#!/usr/bin/env bash
# Diagnóstico y reparación rápida de OpenWA en Railway.
# Uso:
#   export OPENWA_API_URL=https://openwa-railway-production.up.railway.app
#   export OPENWA_API_KEY=dev-admin-key
#   export OPENWA_SESSION_ID=1f5d9616-d30c-4e5d-89c8-3d99285f11bb
#   ./scripts/railway-openwa-check.sh

set -euo pipefail

API_URL="${OPENWA_API_URL:?OPENWA_API_URL requerido}"
API_KEY="${OPENWA_API_KEY:?OPENWA_API_KEY requerido}"
SESSION_ID="${OPENWA_SESSION_ID:?OPENWA_SESSION_ID requerido}"
WEBHOOK_URL="${WEBHOOK_URL:-https://odonto-reminder.vercel.app/api/webhooks/whatsapp}"
TEST_PHONE="${TEST_PHONE:-584121985398}"
BASE="${API_URL%/}"

json() {
  python3 -m json.tool 2>/dev/null || cat
}

echo "=== Health ==="
curl -sS "${BASE}/api/health" | json
echo ""

echo "=== Todas las sesiones ==="
curl -sS -H "X-API-Key: ${API_KEY}" "${BASE}/api/sessions" | json
echo ""

echo "=== Sesión ${SESSION_ID} ==="
SESSION_JSON=$(curl -sS -H "X-API-Key: ${API_KEY}" "${BASE}/api/sessions/${SESSION_ID}")
echo "${SESSION_JSON}" | json
STATUS=$(echo "${SESSION_JSON}" | python3 -c "import sys,json; d=json.load(sys.stdin); print((d.get('data') or d).get('status',''))" 2>/dev/null || echo "")
echo "status=${STATUS}"
echo ""

if [[ "${STATUS}" == "disconnected" || "${STATUS}" == "created" || "${STATUS}" == "failed" ]]; then
  echo "=== Iniciando sesión (POST /start) ==="
  curl -sS -X POST -H "X-API-Key: ${API_KEY}" \
    "${BASE}/api/sessions/${SESSION_ID}/start" | json
  echo ""
  echo "Espera 5s y revisa status (si qr_ready, escanea QR en dashboard)..."
  sleep 5
  curl -sS -H "X-API-Key: ${API_KEY}" "${BASE}/api/sessions/${SESSION_ID}" | json
  echo ""
fi

echo "=== Webhooks registrados ==="
WEBHOOKS=$(curl -sS -H "X-API-Key: ${API_KEY}" \
  "${BASE}/api/sessions/${SESSION_ID}/webhooks")
echo "${WEBHOOKS}" | json
echo ""

if [[ "${WEBHOOKS}" == "[]" || "${WEBHOOKS}" == *'"data":[]'* ]]; then
  echo "=== Registrar webhook → ${WEBHOOK_URL} ==="
  curl -sS -X POST "${BASE}/api/sessions/${SESSION_ID}/webhooks" \
    -H "X-API-Key: ${API_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"${WEBHOOK_URL}\",\"events\":[\"message.received\"]}" | json
  echo ""
fi

echo "=== Prueba envío send-text → ${TEST_PHONE} ==="
SEND=$(curl -sS -w "\nHTTP:%{http_code}" -X POST \
  -H "X-API-Key: ${API_KEY}" \
  -H "Content-Type: application/json" \
  "${BASE}/api/sessions/${SESSION_ID}/messages/send-text" \
  -d "{\"chatId\":\"${TEST_PHONE}@c.us\",\"text\":\"✅ Test OpenWA $(date -u +%H:%M)\"}")
echo "${SEND}"
echo ""

echo "--- Resumen ---"
echo "Si status != ready → dashboard: ${BASE}/dashboard/"
echo "Si send-text HTTP:500 → sesión no conectada o QR pendiente."
echo "Si send-text HTTP:404 → OPENWA_SESSION_ID incorrecto en Vercel."
echo "Variables Railway obligatorias: SESSION_AUTO_START=true, volumen /app/data"
