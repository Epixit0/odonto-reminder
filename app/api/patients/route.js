import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Visit from "@/models/Visit";

function addFollowUpDate(dateString, value, unit) {
  const d = new Date(dateString);

  if (unit === "minutes") {
    d.setMinutes(d.getMinutes() + value);
  } else if (unit === "days") {
    d.setDate(d.getDate() + value);
  } else if (unit === "weeks") {
    d.setDate(d.getDate() + value * 7);
  } else {
    d.setMonth(d.getMonth() + value);
  }

  return d;
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
    treatmentDate,
    followUpDate,
    notifyUnit: safeNotifyUnit,
    notifyValue: safeNotifyValue,
  });

  return NextResponse.json({ item: created }, { status: 201 });
}
