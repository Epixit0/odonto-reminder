"use client";

export function exportVisitsToCSV(visits, t) {
  const headers = [
    t?.patientName || "Paciente",
    "Teléfono",
    t?.treatment || "Tratamiento",
    "Fecha Tratamiento",
    t?.nextVisit || "Próximo Control",
    "Estado",
    "Confirmación",
  ];

  const rows = visits.map((v) => [
    `"${v.patientName}"`,
    v.patientPhone,
    `"${v.treatmentType}"`,
    new Date(v.treatmentDate).toLocaleDateString("es-ES"),
    new Date(v.followUpDate).toLocaleDateString("es-ES"),
    v.confirmationStatus || "pending",
    v.patientResponse || "",
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) => row.join(",")),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `pacientes-${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
