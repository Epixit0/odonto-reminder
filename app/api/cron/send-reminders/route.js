import { NextResponse } from "next/server";
import { runAppointmentReminders } from "@/lib/runAppointmentReminders";

/** Cron Vercel (Hobby: máximo 1× al día). Requiere CRON_SECRET o header x-vercel-cron. */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  const cronHeader = request.headers.get("x-vercel-cron");

  const validSecret = secret && secret === process.env.CRON_SECRET;
  const validVercelCron = cronHeader === "1";

  if (!validSecret && !validVercelCron) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await runAppointmentReminders();
    return NextResponse.json(result);
  } catch (error) {
    console.error("send-reminders:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
