import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";
import Patient from "@/models/Patient";

/**
 * Migración one-shot: crea un Patient por cada Visit existente
 * que no tenga patientId asignado.
 * Las visits del mismo teléfono se agrupan bajo un mismo Patient.
 */
export async function migrateVisitsToPatients() {
  await connectDB();

  // Obtener visits sin patientId
  const unlinkedVisits = await Visit.find({
    patientId: { $exists: false },
  })
    .sort({ createdAt: 1 })
    .lean();

  if (unlinkedVisits.length === 0) {
    return { migrated: 0, message: "No hay visits para migrar" };
  }

  // Agrupar por teléfono
  const phoneGroups = {};
  for (const visit of unlinkedVisits) {
    const phone = visit.patientPhone;
    if (!phoneGroups[phone]) {
      phoneGroups[phone] = [];
    }
    phoneGroups[phone].push(visit);
  }

  let migrated = 0;

  for (const [phone, visits] of Object.entries(phoneGroups)) {
    const firstVisit = visits[0];
    const lastVisit = visits[visits.length - 1];

    // Crear o encontrar Patient existente
    let patient = await Patient.findOne({ phone });

    if (!patient) {
      patient = await Patient.create({
        name: firstVisit.patientName,
        phone,
        language: firstVisit.language || "es",
        totalVisits: visits.length,
        firstContactDate: firstVisit.createdAt || firstVisit.treatmentDate,
        lastVisitDate: lastVisit.treatmentDate,
        nextAppointmentDate: lastVisit.followUpDate || undefined,
        lastActivity: lastVisit.updatedAt || lastVisit.createdAt,
        tags: visits.length >= 3 ? ["recurrente"] : ["nuevo"],
      });
    } else {
      // Actualizar stats del paciente existente
      const allVisitDates = visits.map((v) => v.treatmentDate).filter(Boolean);
      const allFollowUpDates = visits
        .map((v) => v.followUpDate)
        .filter(Boolean);

      patient.totalVisits += visits.length;
      if (allVisitDates.length > 0) {
        const dates = allVisitDates.sort(
          (a, b) => new Date(b) - new Date(a),
        );
        patient.lastVisitDate = dates[0];
      }
      if (allFollowUpDates.length > 0) {
        const dates = allFollowUpDates.sort(
          (a, b) => new Date(b) - new Date(a),
        );
        patient.nextAppointmentDate = dates[0];
      }
      patient.lastActivity = new Date();
      if (!patient.tags.includes("recurrente") && patient.totalVisits >= 3) {
        patient.tags.push("recurrente");
      }
      await patient.save();
    }

    // Vincular todas las visits a este patient
    const visitIds = visits.map((v) => v._id);
    await Visit.updateMany(
      { _id: { $in: visitIds } },
      { $set: { patientId: patient._id } },
    );

    migrated += visits.length;
  }

  return {
    migrated,
    patientsCreated: Object.keys(phoneGroups).length,
    message: `Migradas ${migrated} visits a ${Object.keys(phoneGroups).length} pacientes`,
  };
}
