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

    // Primer recordatorio: notifyValue minutos después de creado
    if (!visit.sent5dPatient && inWindowFromCreated(createdAt, notifyValue)) {
      try {
        await sendReminderToPatient(visit, 5, "minutes");
        if (ownerPhone && !visit.sent5dOwner) {
          await sendReminderToOwner(visit, 5, "minutes");
        }
        await Visit.updateOne(
          { _id: visit._id },
          { $set: { sent5dPatient: true, sent5dOwner: Boolean(ownerPhone) } },
        );
        sent += 1;
        console.log(`✅ Recordatorio enviado a ${visit.patientName} (${notifyValue}min después de registro)`);
      } catch (error) {
        console.error(`Error enviando recordatorio a ${visit.patientName}:`, error);
      }
    }

    // Segundo recordatorio: notifyValue * 2 minutos después de creado
    // (si pusiste 1 min, el segundo llega a los 2 min; si pusiste 5, a los 10 min)
    if (!visit.sent2dPatient && inWindowFromCreated(createdAt, notifyValue * 2)) {
      try {
        await sendReminderToPatient(visit, 2, "minutes");
        if (ownerPhone && !visit.sent2dOwner) {
          await sendReminderToOwner(visit, 2, "minutes");
        }
        await Visit.updateOne(
          { _id: visit._id },
          { $set: { sent2dPatient: true, sent2dOwner: Boolean(ownerPhone) } },
        );
        sent += 1;
        console.log(`✅ Segundo recordatorio enviado a ${visit.patientName} (${notifyValue * 2}min después de registro)`);
      } catch (error) {
        console.error(`Error enviando segundo recordatorio a ${visit.patientName}:`, error);
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
      } else if (!visit.sent2dPatient) {
        const remaining2 = (notifyValue * 2 * 60) - diffSec;
        if (remaining2 > 0) {
          nextReminders.push({
            id: visit._id,
            name: visit.patientName,
            type: `${notifyValue * 2}min`,
            secondsUntilReminder: remaining2,
          });
        }
      }
      pending++;
    }
  }

  return NextResponse.json({ ok: true, sent, pending, nextReminders });
}
