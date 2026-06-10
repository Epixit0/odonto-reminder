/**
 * Sanitiza texto de entrada eliminando HTML/JS peligroso.
 * Usa un enfoque de whitelist: solo permite caracteres seguros.
 */

// Caracteres permitidos: letras, números, espacios, puntuación básica
const SAFE_TEXT_RE = /[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜàèìòùÀÈÌÒÙäëïöüÄËÏÖÜâêîôûÂÊÎÔÛçÇãõÃÕ0-9\s.,;:!?¡¿'"@#%&()\-_/+=*°]/g;

export function sanitizeText(input) {
  if (typeof input !== "string") return "";
  // 1. Strip HTML tags
  const noTags = input.replace(/<[^>]*>/g, "");
  // 2. Strip script/style blocks
  const noBlocks = noTags.replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  // 3. Remove dangerous chars
  const sanitized = noBlocks.replace(SAFE_TEXT_RE, "").trim();
  // 4. Limit length
  return sanitized.slice(0, 500);
}

export function sanitizePhone(input) {
  if (typeof input !== "string") return "";
  // Solo dígitos y + inicial
  const cleaned = input.replace(/[^\d+]/g, "");
  // Asegurar que empiece con +
  if (!cleaned.startsWith("+")) return `+${cleaned.replace(/^0+/, "")}`;
  return cleaned.slice(0, 20);
}

export function sanitizeWhatsAppBody(input) {
  if (typeof input !== "string") return "";
  // WhatsApp messages can have emojis, keep them
  // But strip any HTML/JS
  const noTags = input.replace(/<[^>]*>/g, "");
  return noTags.slice(0, 500).trim();
}
