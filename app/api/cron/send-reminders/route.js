import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";
import { sendReminderToPatient, sendReminderToOwner } from "@/lib/whatsapp";
import { normalizeChatId } from "@/lib/chatId";
import { isAppointmentReminderDue } from "@/lib/reminders";

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

  const visits = await Visit.find({
    notifyUnit: { $ne: "minutes" },
    $or: [
      { confirmationStatus: { $exists: false } },
      { confirmationStatus: "pending" },
    ],
    sent5dPatient: false,
  }).lean();

  const ownerPhone = process.env.OWNER_WHATSAPP_PHONE;
  let sent = 0;
  let skipped = 0;
  const errors = [];
  const now = new Date();

  for (const visit of visits) {
    if (visit.confirmationStatus && visit.confirmationStatus !== "pending") {
      skipped += 1;
      continue;
    }

    if (!isAppointmentReminderDue(visit, now)) {
      continue;
    }

    try {
      const result = await sendReminderToPatient(visit);

      if (ownerPhone && !visit.sent5dOwner) {
        await sendReminderToOwner(visit);
      }

      const updateFields = {
        sent5dPatient: true,
        sent2dPatient: true,
        sent5dOwner: Boolean(ownerPhone),
        sent2dOwner: Boolean(ownerPhone),
      };
      const chatId = normalizeChatId(result?.resolvedChatId);
      if (chatId) {
        updateFields.patientChatId = chatId;
      }
      await Visit.updateOne({ _id: visit._id }, { $set: updateFields });
      sent += 1;
    } catch (error) {
      console.error(`Error enviando recordatorio a ${visit.patientName}:`, error);
      errors.push({ patient: visit.patientName, error: error.message });
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
