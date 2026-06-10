import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Patient from "@/models/Patient";

export async function GET(request) {
  try {
    const session = await getSession();
    if (!session?.username) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q");

    if (!q || q.length < 2) {
      return NextResponse.json({ items: [] });
    }

    await connectDB();

    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const patients = await Patient.find({
      $or: [
        { name: { $regex: escaped, $options: "i" } },
        { phone: { $regex: escaped, $options: "i" } },
      ],
    })
      .select("name phone language lastVisitDate totalVisits tags")
      .limit(8)
      .sort({ lastActivity: -1 })
      .lean();

    return NextResponse.json({ items: patients });
  } catch (error) {
    console.error("GET /api/patients/search error:", error);
    return NextResponse.json({ error: "Error en búsqueda" }, { status: 500 });
  }
}
