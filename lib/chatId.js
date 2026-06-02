/** Normaliza chatId de OpenWA / whatsapp-web.js a string "123@c.us" o "xxx@lid". */
export function normalizeChatId(value) {
  if (value == null) return null;

  if (typeof value === "string") {
    const s = value.trim();
    if (!s || s === "[object Object]") return null;
    if (s.includes("@")) return s;
    const digits = s.replace(/\D/g, "");
    if (digits) return `${digits}@c.us`;
    return null;
  }

  if (typeof value === "object") {
    if (typeof value._serialized === "string") return normalizeChatId(value._serialized);
    if (typeof value.serialized === "string") return normalizeChatId(value.serialized);
    if (value.user && value.server) {
      return `${String(value.user).replace(/\D/g, "")}@${value.server}`;
    }
    if (value.id != null) return normalizeChatId(value.id);
    if (typeof value.chatId === "string" || typeof value.chatId === "object") {
      return normalizeChatId(value.chatId);
    }
    if (typeof value.whatsappId === "string" || typeof value.whatsappId === "object") {
      return normalizeChatId(value.whatsappId);
    }
  }

  return null;
}

export function isValidStoredChatId(chatId) {
  if (!chatId || typeof chatId !== "string") return false;
  if (chatId === "[object Object]") return false;
  return chatId.includes("@");
}

export function phoneTailDigits(phoneOrChatId, len = 10) {
  if (!phoneOrChatId) return "";
  return String(phoneOrChatId).replace(/\D/g, "").slice(-len);
}
