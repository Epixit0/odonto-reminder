import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Patient from "@/models/Patient";
import Visit from "@/models/Visit";

export async function GET(request, { params }) {
  const session = await getSession();
  if (!session?.username) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await connectDB();
  const { id } = await params;

  const patient = await Patient.findById(id).lean();
  if (!patient) {
    return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
  }

  const visits = await Visit.find({ patientId: id })
    .sort({ treatmentDate: -1 })
    .lean();

  return NextResponse.json({ patient, visits });
}

export async function PATCH(request, { params }) {
  const session = await getSession();
  if (!session?.username) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await connectDB();
  const { id } = await params;
  const payload = await request.json();

  const updated = await Patient.findByIdAndUpdate(id, payload, { new: true }).lean();
  if (!updated) {
    return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ patient: updated });
}
