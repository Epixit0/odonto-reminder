import { createHmac, timingSafeEqual } from "crypto";

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

/**
 * Verifica la firma HMAC-SHA256 de un payload entrante.
 * El cliente debe enviar el header X-Webhook-Signature con el HMAC hex.
 * 
 * @param {object|string} payload — El cuerpo del webhook
 * @param {string|null} signature — El valor del header X-Webhook-Signature
 * @returns {boolean}
 */
export function verifyWebhookSignature(payload, signature) {
  // Si no hay secret configurado, permitir (modo desarrollo)
  if (!WEBHOOK_SECRET) {
    return true;
  }

  if (!signature) return false;

  const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
  const hmac = createHmac("sha256", WEBHOOK_SECRET)
    .update(payloadStr)
    .digest("hex");

  try {
    const sigBuf = Buffer.from(signature, "utf8");
    const hmacBuf = Buffer.from(hmac, "utf8");

    if (sigBuf.length !== hmacBuf.length) return false;
    return timingSafeEqual(sigBuf, hmacBuf);
  } catch {
    return false;
  }
}

/**
 * Genera una firma HMAC para un payload (útil para tests).
 */
export function signWebhookPayload(payload) {
  if (!WEBHOOK_SECRET) return "";
  const payloadStr = typeof payload === "string" ? payload : JSON.stringify(payload);
  return createHmac("sha256", WEBHOOK_SECRET)
    .update(payloadStr)
    .digest("hex");
}
