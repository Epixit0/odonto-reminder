import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";
import { sendReminderToPatient, sendReminderToOwner } from "@/lib/whatsapp";

function inWindowFromCreated(createdAt, minutesAfter) {
  const now = new Date();
  const start = new Date(now.getTime() - 30 * 1000);
  const end = new Date(now.getTime() + 30 * 1000);

  const target = new Date(createdAt);
  target.setMinutes(target.getMinutes() + minutesAfter);

  return target >= start && target <= end;
}

export async function GET() {
  await connectDB();

  const visits = await Visit.find({
    notifyUnit: "minutes",
    $or: [
      { confirmationStatus: { $exists: false } },
      { confirmationStatus: "pending" },
    ],
  }).lean();

  // Limpiar flag de re-envío para visitas que enviaron recordatorio pero no tienen patientChatId
  // Esto permite que el cron re-intente capturar el lid real con el OpenWA corregido
  await Visit.updateMany(
    { sent5dPatient: true, patientChatId: { $exists: false }, resendingChatId: true },
    { $unset: { resendingChatId: 1 } }
  );

  const ownerPhone = process.env.OWNER_WHATSAPP_PHONE;
  let sent = 0;
  let pending = 0;
  const nextReminders = [];
  const now = new Date();

  for (const visit of visits) {
    const createdAt = new Date(visit.createdAt);
    const notifyValue = visit.notifyValue || 1;
    const diffSec = Math.round((now.getTime() - createdAt.getTime()) / 1000);
    const remainingSec = (notifyValue * 60) - diffSec; // segundos que faltan para el recordatorio

    // Recordatorio único: notifyValue minutos después de creado
    if (!visit.sent5dPatient && inWindowFromCreated(createdAt, notifyValue)) {
      try {
        const result = await sendReminderToPatient(visit, 5, "minutes");
        if (ownerPhone && !visit.sent5dOwner) {
          await sendReminderToOwner(visit, 5, "minutes");
        }
        const updateFields = { sent5dPatient: true, sent2dPatient: true, sent5dOwner: Boolean(ownerPhone), sent2dOwner: Boolean(ownerPhone) };
        if (result?.resolvedChatId) {
          updateFields.patientChatId = result.resolvedChatId;
        }
        await Visit.updateOne(
          { _id: visit._id },
          { $set: updateFields },
        );
        sent += 1;
        console.log(`✅ Recordatorio enviado a ${visit.patientName} (${notifyValue}min después de registro)`);
      } catch (error) {
        console.error(`Error enviando recordatorio a ${visit.patientName}:`, error);
      }
    }

    // Si ya se envió el recordatorio pero no tenemos el patientChatId,
    // re-enviar para capturarlo (máximo una vez, controlado con un flag)
    if (visit.sent5dPatient && !visit.patientChatId && !visit.resendingChatId) {
      try {
        console.log(`🔄 Re-enviando recordatorio a ${visit.patientName} para capturar chatId...`);
        const result = await sendReminderToPatient(visit, 5, "minutes");
        // Marcar que ya intentamos re-enviar para no spamear
        const updateFields = { resendingChatId: true };
        if (result?.resolvedChatId) {
          updateFields.patientChatId = result.resolvedChatId;
          console.log(`✅ chatId guardado para ${visit.patientName}: ${result.resolvedChatId}`);
        }
        await Visit.updateOne({ _id: visit._id }, { $set: updateFields });
        sent += 1;
      } catch (error) {
        console.error(`Error re-enviando a ${visit.patientName}:`, error);
        await Visit.updateOne({ _id: visit._id }, { $set: { resendingChatId: true } });
      }
    }

    // Calcular próximos recordatorios para mostrar countdown
    if (remainingSec > 0 && remainingSec < 600) {
      if (!visit.sent5dPatient) {
        nextReminders.push({
          id: visit._id,
          name: visit.patientName,
          type: `${notifyValue}min`,
          secondsUntilReminder: remainingSec,
        });
      }
      pending++;
    }
  }

  return NextResponse.json({ ok: true, sent, pending, nextReminders });
}
