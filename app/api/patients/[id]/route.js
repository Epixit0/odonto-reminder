import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Patient from "@/models/Patient";
import Visit from "@/models/Visit";
import { visitPatchSchema } from "@/lib/validation";
import { sanitizeText, sanitizePhone } from "@/lib/sanitize";
import { logAudit } from "@/lib/audit";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/patients/[id]");

export async function GET(request, { params }) {
  try {
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
  } catch (error) {
    console.error("GET /api/patients/[id] error:", error);
    return NextResponse.json({ error: "Error al cargar paciente" }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const session = await getSession();
    if (!session?.username) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();

    // Validar con Zod
    const parsed = visitPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Sanitizar campos de texto
    const updateData = { ...parsed.data };
    if (updateData.notes) updateData.notes = sanitizeText(updateData.notes);
    if (updateData.patientResponse) updateData.patientResponse = sanitizeText(updateData.patientResponse);

    await connectDB();
    const { id } = await params;

    const updated = await Patient.findByIdAndUpdate(id, updateData, { new: true }).lean();
    if (!updated) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
    }

    await logAudit({
      action: "update",
      resource: "patient",
      resourceId: id,
      details: updateData,
    });

    return NextResponse.json({ patient: updated });
  } catch (error) {
    log.error(error, "PATCH /api/patients/[id] error");
    return NextResponse.json({ error: "Error al actualizar paciente" }, { status: 500 });
  }
}
