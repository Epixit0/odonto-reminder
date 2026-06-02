import { normalizeChatId, phoneTailDigits } from "@/lib/chatId";

/** Resuelve teléfono real desde chatId (@lid o @c.us) vía OpenWA.akslndaklsdklasdlkalksda */
export async function resolvePhoneFromChatId(sessionId, chatId) {
  const baseUrl = process.env.OPENWA_API_URL;
  const apiKey = process.env.OPENWA_API_KEY;
  if (!baseUrl || !apiKey || !sessionId || !chatId) return null;

  try {
    if (chatId.endsWith("@lid")) {
      const encoded = encodeURIComponent(chatId);
      const res = await fetch(
        `${baseUrl.replace(/\/$/, "")}/api/sessions/${encodeURIComponent(sessionId)}/contacts/${encoded}`,
        { headers: { "X-API-Key": apiKey } },
      );
      if (!res.ok) return null;
      const json = await res.json();
      const data = json.data ?? json;

      // OpenWA: para @lid, id = 584...@c.us (teléfono real); number = dígitos internos del lid
      const resolvedChatId = normalizeChatId(data?.id);
      if (resolvedChatId?.endsWith("@c.us")) {
        return {
          number: resolvedChatId.replace(/@c.us$/, ""),
          chatId: resolvedChatId,
        };
      }

      const pushName = data?.pushName || data?.name || null;
      return pushName ? { number: null, chatId, pushName } : null;
    }

    const digits = chatId.replace(/\D/g, "");
    if (!digits) return null;

    const res = await fetch(
      `${baseUrl.replace(/\/$/, "")}/api/sessions/${encodeURIComponent(sessionId)}/contacts/check/${digits}`,
      { headers: { "X-API-Key": apiKey } },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const data = json.data ?? json;
    const resolvedChatId =
      normalizeChatId(data?.chatId) ||
      normalizeChatId(data?.whatsappId) ||
      normalizeChatId(data?.id) ||
      `${digits}@c.us`;
    return {
      number: phoneTailDigits(resolvedChatId, 15) || digits,
      chatId: resolvedChatId,
    };
  } catch {
    return null;
  }
}
