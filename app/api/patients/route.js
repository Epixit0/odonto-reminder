import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Visit from "@/models/Visit";

function addFollowUpDate(dateString, value, unit) {
  // Parse YYYY-MM-DD como fecha local, no UTC
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  if (unit === "minutes") {
    date.setMinutes(date.getMinutes() + value);
  } else if (unit === "days") {
    date.setDate(date.getDate() + value);
  } else if (unit === "weeks") {
    date.setDate(date.getDate() + value * 7);
  } else {
    date.setMonth(date.getMonth() + value);
  }

  return date;
}

export async function GET() {
  const session = await getSession();
  if (!session?.username) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await connectDB();
  const items = await Visit.find({}).sort({ createdAt: -1 }).limit(200).lean();
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
    notifyUnit,
    notifyValue,
  } = payload;

  if (!patientName || !patientPhone || !treatmentType || !treatmentDate) {
    return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
  }

  const allowedUnits = ["minutes", "days", "weeks", "months"];
  const safeNotifyUnit = allowedUnits.includes(notifyUnit)
    ? notifyUnit
    : "months";
  const parsedNotifyValue = Number.parseInt(String(notifyValue ?? "3"), 10);
  const safeNotifyValue =
    Number.isFinite(parsedNotifyValue) && parsedNotifyValue > 0
      ? parsedNotifyValue
      : 3;

  // Parse treatmentDate como local (YYYY-MM-DD)
  const [ty, tm, td] = treatmentDate.split("-").map(Number);
  const parsedTreatmentDate = new Date(ty, tm - 1, td);

  const followUpDate = addFollowUpDate(
    treatmentDate,
    safeNotifyValue,
    safeNotifyUnit,
  );

  await connectDB();
  const created = await Visit.create({
    patientName,
    patientPhone,
    language,
    treatmentType,
    treatmentDate: parsedTreatmentDate,
    followUpDate,
    notifyUnit: safeNotifyUnit,
    notifyValue: safeNotifyValue,
  });

  return NextResponse.json({ item: created }, { status: 201 });
}
