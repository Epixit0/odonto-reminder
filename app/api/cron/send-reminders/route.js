import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";
import { sendReminderToPatient, sendReminderToOwner } from "@/lib/whatsapp";

function inWindowDays(targetDate, daysBefore) {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const reminderDate = new Date(targetDate);
  reminderDate.setDate(reminderDate.getDate() - daysBefore);

  return reminderDate >= start && reminderDate < end;
}

function inWindowMinutes(targetDate, minutesBefore) {
  const now = new Date();
  const start = new Date(now.getTime() - 30 * 1000);
  const end = new Date(now.getTime() + 30 * 1000);

  const reminderDate = new Date(targetDate);
  reminderDate.setMinutes(reminderDate.getMinutes() - minutesBefore);

  return reminderDate >= start && reminderDate <= end;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const cronHeader = request.headers.get("x-vercel-cron");

  const validSecret = secret && secret === process.env.CRON_SECRET;
  const validVercelCron = cronHeader === "1";

  if (!validSecret && !validVercelCron) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await connectDB();
  
  // Solo buscar visitas pendientes (no confirmadas ni canceladas)
  const visits = await Visit.find({
    $or: [
      { confirmationStatus: { $exists: false } },
      { confirmationStatus: "pending" },
    ],
  }).lean();

  const ownerPhone = process.env.OWNER_WHATSAPP_PHONE;
  let sent = 0;
  let skipped = 0;
  const errors = [];

  for (const visit of visits) {
    // Saltar si ya está confirmado o cancelado
    if (visit.confirmationStatus && visit.confirmationStatus !== "pending") {
      skipped += 1;
      continue;
    }

    const isMinuteMode = visit.notifyUnit === "minutes";
    const firstReminderMatch = isMinuteMode
      ? inWindowMinutes(visit.followUpDate, 5)
      : inWindowDays(visit.followUpDate, 5);
    const secondReminderMatch = isMinuteMode
      ? inWindowMinutes(visit.followUpDate, 2)
      : inWindowDays(visit.followUpDate, 2);

    // Primer recordatorio (5 días/minutos antes)
    if (firstReminderMatch && !visit.sent5dPatient) {
      try {
        await sendReminderToPatient(visit, 5, isMinuteMode ? "minutes" : "days");
        
        if (ownerPhone && !visit.sent5dOwner) {
          await sendReminderToOwner(visit, 5, isMinuteMode ? "minutes" : "days");
        }

        await Visit.updateOne(
          { _id: visit._id },
          { $set: { sent5dPatient: true, sent5dOwner: Boolean(ownerPhone) } },
        );
        sent += 1;
      } catch (error) {
        console.error(`Error enviando recordatorio 5d a ${visit.patientName}:`, error);
        errors.push({ patient: visit.patientName, error: error.message });
      }
    }

    // Segundo recordatorio (2 días/minutos antes)
    if (secondReminderMatch && !visit.sent2dPatient) {
      try {
        await sendReminderToPatient(visit, 2, isMinuteMode ? "minutes" : "days");
        
        if (ownerPhone && !visit.sent2dOwner) {
          await sendReminderToOwner(visit, 2, isMinuteMode ? "minutes" : "days");
        }

        await Visit.updateOne(
          { _id: visit._id },
          { $set: { sent2dPatient: true, sent2dOwner: Boolean(ownerPhone) } },
        );
        sent += 1;
      } catch (error) {
        console.error(`Error enviando recordatorio 2d a ${visit.patientName}:`, error);
        errors.push({ patient: visit.patientName, error: error.message });
      }
    }
  }

  return NextResponse.json({ 
    ok: true, 
    sent, 
    skipped,
    total: visits.length,
    errors: errors.length > 0 ? errors : undefined,
  });
}
