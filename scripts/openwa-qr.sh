#!/usr/bin/env bash
# Descarga el QR de OpenWA como PNG.
# Uso: ./scripts/openwa-qr.sh [SESSION_ID] [archivo_salida.png]

set -euo pipefail

API_URL="${OPENWA_API_URL:-https://openwa-railway-production.up.railway.app}"
API_KEY="${OPENWA_API_KEY:-dev-admin-key}"
SESSION_ID="${1:-${OPENWA_SESSION_ID:-}}"
OUT="${2:-$HOME/qr-openwa.png}"
TMP_JSON="$(mktemp)"

if [[ -z "$SESSION_ID" ]]; then
  echo "Uso: $0 SESSION_ID [salida.png]" >&2
  echo "  o define OPENWA_SESSION_ID en el entorno" >&2
  exit 1
fi

trap 'rm -f "$TMP_JSON"' EXIT

echo "Obteniendo QR de sesión: $SESSION_ID"

HTTP_CODE=$(curl -sS -w "%{http_code}" -o "$TMP_JSON" \
  "${API_URL%/}/api/sessions/${SESSION_ID}/qr" \
  -H "X-API-Key: ${API_KEY}")

if [[ "$HTTP_CODE" != "200" ]]; then
  echo "Error HTTP $HTTP_CODE:" >&2
  cat "$TMP_JSON" >&2
  exit 1
fi

python3 - "$OUT" "$TMP_JSON" <<'PY'
import base64
import json
import sys

out_path = sys.argv[1]
json_path = sys.argv[2]

with open(json_path, encoding="utf-8") as f:
    data = json.load(f)

qr = (
    data.get("qrCode")
    or data.get("image")
    or (data.get("data") or {}).get("qrCode")
    or (data.get("data") or {}).get("image")
)

if not qr:
    print("No se encontró qrCode en la respuesta:", data, file=sys.stderr)
    sys.exit(1)

if "," in qr:
    qr = qr.split(",", 1)[1]

with open(out_path, "wb") as f:
    f.write(base64.b64decode(qr))

print(f"QR guardado en: {out_path}")
PY

ls -la "$OUT"

# En WSL: abrir en Windows (opcional)
if command -v explorer.exe >/dev/null 2>&1; then
  WIN_PATH=$(wslpath -w "$OUT" 2>/dev/null || true)
  if [[ -n "${WIN_PATH:-}" ]]; then
    echo "Abrir en Windows: explorer.exe \"$WIN_PATH\""
  fi
fi
