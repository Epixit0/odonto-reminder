import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Visit from "@/models/Visit";
import Patient from "@/models/Patient";
import { parseAppointmentDateTime, REMINDER_HOURS_BEFORE } from "@/lib/reminders";

export async function GET() {
  const session = await getSession();
  if (!session?.username) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await connectDB();
  const items = await Visit.find({})
    .populate("patientId", "name phone tags totalVisits")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  return NextResponse.json({ items });
}

export async function POST(request) {
  const session = await getSession();
  if (!session?.username) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const payload = await request.json();
  const {
    patientName,
    patientPhone,
    language,
    treatmentType,
    treatmentDate,
    appointmentDate,
    appointmentTime,
    notifyUnit,
    notifyValue,
  } = payload;

  const isMinuteTest = notifyUnit === "minutes";
  const dateForAppointment = appointmentDate || treatmentDate;

  if (!patientName || !patientPhone || !treatmentType || (!isMinuteTest && !dateForAppointment)) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const allowedUnits = ["minutes", "appointment", "days", "weeks", "months"];
  const safeNotifyUnit = allowedUnits.includes(notifyUnit) ? notifyUnit : "appointment";

  const parsedNotifyValue = Number.parseInt(String(notifyValue ?? (isMinuteTest ? "1" : "1")), 10);
  const safeNotifyValue =
    Number.isFinite(parsedNotifyValue) && parsedNotifyValue > 0 ? parsedNotifyValue : 1;

  const now = new Date();
  let parsedTreatmentDate;
  let followUpDate;

  if (isMinuteTest) {
    parsedTreatmentDate = now;
    followUpDate = new Date(now.getTime() + safeNotifyValue * 60 * 1000);
  } else {
    followUpDate = parseAppointmentDateTime(dateForAppointment, appointmentTime || "09:00");
    if (followUpDate <= now) {
      return NextResponse.json({ error: "La cita debe ser en el futuro" }, { status: 400 });
    }
    const [ty, tm, td] = dateForAppointment.split("-").map(Number);
    parsedTreatmentDate = new Date(ty, tm - 1, td);
  }

  await connectDB();

  let patient = await Patient.findOne({ phone: patientPhone });

  if (!patient) {
    patient = await Patient.create({
      name: patientName,
      phone: patientPhone,
      language: language || "es",
      totalVisits: 1,
      firstContactDate: now,
      lastVisitDate: parsedTreatmentDate,
      nextAppointmentDate: followUpDate,
      lastActivity: now,
      tags: ["nuevo"],
    });
  } else {
    patient.totalVisits = (patient.totalVisits || 0) + 1;
    patient.lastVisitDate = parsedTreatmentDate;
    patient.nextAppointmentDate = followUpDate;
    patient.lastActivity = now;
    if (!patient.tags.includes("recurrente") && patient.totalVisits >= 3) {
      patient.tags.push("recurrente");
    }
    await patient.save();
  }

  const created = await Visit.create({
    patientName,
    patientPhone,
    language,
    treatmentType,
    treatmentDate: parsedTreatmentDate,
    followUpDate,
    notifyUnit: safeNotifyUnit,
    notifyValue: safeNotifyValue,
    reminderHoursBefore: REMINDER_HOURS_BEFORE,
    patientId: patient._id,
  });

  return NextResponse.json({ item: created, patient }, { status: 201 });
}
