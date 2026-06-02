import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";
import { sendReminderToPatient, sendReminderToOwner } from "@/lib/whatsapp";
import { normalizeChatId } from "@/lib/chatId";

export async function GET() {
  await connectDB();

  const visits = await Visit.find({
    notifyUnit: "minutes",
    $or: [
      { confirmationStatus: { $exists: false } },
      { confirmationStatus: "pending" },
    ],
    sent5dPatient: false,
  }).lean();

  const ownerPhone = process.env.OWNER_WHATSAPP_PHONE;
  let sent = 0;
  const now = new Date();

  for (const visit of visits) {
    const createdAt = new Date(visit.createdAt);
    const notifyValue = visit.notifyValue || 1;
    const diffMs = now.getTime() - createdAt.getTime();
    const diffSec = Math.round(diffMs / 1000);
    const targetSec = notifyValue * 60;

    // Si ya pasó el tiempo del recordatorio y no se ha enviado → enviar
    if (diffSec >= targetSec) {
      try {
        const result = await sendReminderToPatient(visit, 5, "minutes");
        if (ownerPhone && !visit.sent5dOwner) {
          await sendReminderToOwner(visit, 5, "minutes");
        }
        const updateFields = { sent5dPatient: true, sent2dPatient: true, sent5dOwner: Boolean(ownerPhone), sent2dOwner: Boolean(ownerPhone) };
        const chatId = normalizeChatId(result?.resolvedChatId);
        if (chatId) {
          updateFields.patientChatId = chatId;
        }
        await Visit.updateOne({ _id: visit._id }, { $set: updateFields });
        sent += 1;
        console.log(`✅ Recordatorio enviado a ${visit.patientName} (${diffSec}s después de registro)`);
      } catch (error) {
        console.error(`Error enviando recordatorio a ${visit.patientName}:`, error);
      }
    }
  }

  return NextResponse.json({ ok: true, sent, pending: visits.length - sent });
}
