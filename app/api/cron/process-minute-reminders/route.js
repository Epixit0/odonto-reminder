import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";
import { sendReminderToPatient, sendReminderToOwner } from "@/lib/whatsapp";

function inWindowMinutes(targetDate, minutesBefore) {
  const now = new Date();
  const start = new Date(now.getTime() - 30 * 1000);
  const end = new Date(now.getTime() + 30 * 1000);

  const reminderDate = new Date(targetDate);
  reminderDate.setMinutes(reminderDate.getMinutes() - minutesBefore);

  return reminderDate >= start && reminderDate <= end;
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
    const followUpDate = new Date(visit.followUpDate);
    const diffMs = followUpDate.getTime() - now.getTime();
    const diffSec = Math.round(diffMs / 1000);

    // Primer recordatorio (5 min antes)
    if (!visit.sent5dPatient && inWindowMinutes(followUpDate, 5)) {
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
      } catch (error) {
        console.error(`Error enviando recordatorio 5min a ${visit.patientName}:`, error);
      }
    }

    // Segundo recordatorio (2 min antes)
    if (!visit.sent2dPatient && inWindowMinutes(followUpDate, 2)) {
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
      } catch (error) {
        console.error(`Error enviando recordatorio 2min a ${visit.patientName}:`, error);
      }
    }

    // Calcular próximos recordatorios
    if (diffSec > 0 && diffSec < 600) { // Solo próximos 10 min
      const next5min = !visit.sent5dPatient && diffSec > 60 && diffSec <= 330; // entre 1-5.5 min
      const next2min = !visit.sent2dPatient && diffSec > 0 && diffSec <= 150; // entre 0-2.5 min
      
      if (next5min || next2min) {
        const reminderTime = next5min ? diffSec - 300 : diffSec - 120;
        nextReminders.push({
          id: visit._id,
          name: visit.patientName,
          type: next5min ? "5min" : "2min",
          secondsUntilReminder: Math.abs(reminderTime),
        });
      }
      pending++;
    }
  }

  return NextResponse.json({ ok: true, sent, pending, nextReminders });
}
