import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Visit from "@/models/Visit";
import Patient from "@/models/Patient";
import { parseAppointmentDateTime, REMINDER_HOURS_BEFORE } from "@/lib/reminders";
import { patientSchema } from "@/lib/validation";
import { sanitizeText, sanitizePhone } from "@/lib/sanitize";
import { paginate } from "@/lib/paginate";
import { createLogger } from "@/lib/logger";
import { logAudit, extractRequestInfo } from "@/lib/audit";

const log = createLogger("api/patients");

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session?.username) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor") || undefined;
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);

    await connectDB();

    const result = await paginate(Visit, {}, {
      cursor,
      limit,
      sort: { createdAt: -1 },
      populate: "patientId",
      select: "name phone tags totalVisits",
    });

    return NextResponse.json({
      items: result.items,
      nextCursor: result.nextCursor,
      hasMore: result.hasMore,
    });
  } catch (error) {
    log.error(error, "GET /api/patients error");
    return NextResponse.json({ error: "Error al cargar pacientes" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getSession();
    if (!session?.username) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const payload = await request.json();

    const parsed = patientSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const {
      patientName,
      patientPhone,
      language,
      treatmentType,
      appointmentDate,
      appointmentTime,
      appointmentDateTime,
      notifyUnit,
      notifyValue,
    } = parsed.data;

    const safeName = sanitizeText(patientName);
    const safePhone = sanitizePhone(patientPhone);
    const safeTreatment = sanitizeText(treatmentType);

    if (!safeName || !safePhone || !safeTreatment) {
      return NextResponse.json({ error: "Datos inválidos después de sanitizar" }, { status: 400 });
    }

    const isMinuteTest = notifyUnit === "minutes";

    let dateForAppointment = appointmentDate;
    let timeForAppointment = appointmentTime || "09:00";

    if (!isMinuteTest && appointmentDateTime && String(appointmentDateTime).includes("T")) {
      const [d, t] = String(appointmentDateTime).split("T");
      dateForAppointment = d;
      timeForAppointment = (t || "09:00").slice(0, 5);
    }

    if (!isMinuteTest && !dateForAppointment) {
      return NextResponse.json({ error: "Fecha de cita requerida" }, { status: 400 });
    }

    const now = new Date();
    let parsedTreatmentDate;
    let followUpDate;

    if (isMinuteTest) {
      parsedTreatmentDate = now;
      followUpDate = new Date(now.getTime() + notifyValue * 60 * 1000);
    } else {
      followUpDate = parseAppointmentDateTime(dateForAppointment, timeForAppointment);
      if (followUpDate <= now) {
        return NextResponse.json({ error: "La cita debe ser en el futuro" }, { status: 400 });
      }
      const [ty, tm, td] = dateForAppointment.split("-").map(Number);
      parsedTreatmentDate = new Date(ty, tm - 1, td);
    }

    await connectDB();

    let patient = await Patient.findOne({ phone: safePhone });

    if (!patient) {
      patient = await Patient.create({
        name: safeName,
        phone: safePhone,
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
      patientName: safeName,
      patientPhone: safePhone,
      language,
      treatmentType: safeTreatment,
      treatmentDate: parsedTreatmentDate,
      followUpDate,
      notifyUnit,
      notifyValue,
      reminderHoursBefore: REMINDER_HOURS_BEFORE,
      patientId: patient._id,
    });

    await logAudit({
      action: "create",
      resource: "visit",
      resourceId: created._id,
      details: { patientName: safeName, treatmentType: safeTreatment },
    });

    return NextResponse.json({ item: created, patient }, { status: 201 });
  } catch (error) {
    log.error(error, "POST /api/patients error");
    return NextResponse.json({ error: "Error al guardar paciente" }, { status: 500 });
  }
}
