import { NextResponse } from "next/server";
import { runAppointmentReminders } from "@/lib/runAppointmentReminders";

/** Polling desde el dashboard (Hobby: cron Vercel solo 1×/día). */
export async function GET() {
  try {
    const result = await runAppointmentReminders();
    return NextResponse.json(result);
  } catch (error) {
    console.error("process-appointment-reminders:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
