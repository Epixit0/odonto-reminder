import Visit from "@/models/Visit";
import { phoneTailDigits } from "@/lib/chatId";

/** Busca visita pendiente priorizando chatId (@lid) y teléfono real. */
export async function findPendingVisit({ fromChatId, phoneDigits, resolvedChatId }) {
  const pendingFilter = { confirmationStatus: "pending" };

  const chatIds = [fromChatId, resolvedChatId].filter(Boolean);
  for (const chatId of chatIds) {
    if (!chatId) continue;
    const byChat = await Visit.findOne({
      ...pendingFilter,
      patientChatId: chatId,
    }).sort({ createdAt: -1 });
    if (byChat) return byChat;
  }

  if (phoneDigits && phoneDigits.length >= 8) {
    const byPhone = await Visit.findOne({
      ...pendingFilter,
      patientPhone: { $regex: phoneDigits },
    }).sort({ createdAt: -1 });

    if (byPhone) return byPhone;
  }

  if (fromChatId) {
    const chatTail = phoneTailDigits(fromChatId, 8);
    if (chatTail.length >= 8 && !fromChatId.endsWith("@lid")) {
      const allPending = await Visit.find(pendingFilter)
        .sort({ createdAt: -1 })
        .limit(30)
        .lean();

      for (const v of allPending) {
        const phoneTail = phoneTailDigits(v.patientPhone, 8);
        if (phoneTail && phoneTail === chatTail) {
          return await Visit.findById(v._id);
        }
      }
    }
  }

  return null;
}
