import Visit from "@/models/Visit";
import { isValidStoredChatId, phoneTailDigits } from "@/lib/chatId";

/** Busca visita pendiente priorizando teléfono (único) sobre chatId corrupto. */
export async function findPendingVisit({ fromChatId, phoneDigits }) {
  const pendingFilter = { confirmationStatus: "pending" };

  if (phoneDigits && phoneDigits.length >= 8) {
    const byPhone = await Visit.findOne({
      ...pendingFilter,
      patientPhone: { $regex: phoneDigits },
    }).sort({ createdAt: -1 });

    if (byPhone) return byPhone;
  }

  if (fromChatId && isValidStoredChatId(fromChatId)) {
    const byChat = await Visit.findOne({
      ...pendingFilter,
      patientChatId: fromChatId,
    }).sort({ createdAt: -1 });

    if (byChat) return byChat;
  }

  if (fromChatId) {
    const chatTail = phoneTailDigits(fromChatId, 8);
    if (chatTail.length >= 8) {
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
