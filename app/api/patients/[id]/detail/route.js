import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Patient from "@/models/Patient";
import Visit from "@/models/Visit";

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
      .limit(20)
      .lean();

    // Calcular resumen de cuenta
    const accountSummary = {
      totalCharged: visits.reduce((sum, v) => sum + (v.cost || 0), 0),
      totalPaid: visits.reduce((sum, v) => sum + (v.paid ? v.cost || 0 : 0), 0),
      pending: visits.reduce((sum, v) => sum + (!v.paid ? v.cost || 0 : 0), 0),
    };

    return NextResponse.json({ patient, visits, accountSummary });
  } catch (error) {
    console.error("GET /api/patients/[id]/detail error:", error);
    return NextResponse.json({ error: "Error al cargar detalle" }, { status: 500 });
  }
}
