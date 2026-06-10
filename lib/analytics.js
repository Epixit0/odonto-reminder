/**
 * Funciones de agregación para analytics del dashboard.
 * @param {Array} visits — Lista de visitas (visits)
 */

/**
 * Agrupa visits por mes
 */
export function groupVisitsByMonth(visits) {
  const map = {};
  visits.forEach((v) => {
    const d = new Date(v.followUpDate || v.treatmentDate);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map[key]) map[key] = 0;
    map[key]++;
  });
  return Object.entries(map)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6) // últimos 6 meses
    .map(([month, count]) => ({ month, count }));
}

/**
 * Distribución por tipo de tratamiento
 */
export function groupVisitsByTreatment(visits) {
  const map = {};
  visits.forEach((v) => {
    const t = v.treatmentType || "Otros";
    if (!map[t]) map[t] = 0;
    map[t]++;
  });
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));
}

/**
 * Reportes generales
 */
export function computeAnalytics(visits) {
  const total = visits.length;
  const confirmed = visits.filter((v) => v.confirmationStatus === "confirmed").length;
  const pending = visits.filter((v) => !v.confirmationStatus || v.confirmationStatus === "pending").length;
  const cancelled = visits.filter((v) => v.confirmationStatus === "cancelled").length;

  return {
    total,
    confirmed,
    pending,
    cancelled,
    confirmationRate: total > 0 ? Math.round((confirmed / total) * 100) : 0,
    totalCharged: visits.reduce((sum, v) => sum + (v.cost || 0), 0),
    totalPaid: visits.reduce((sum, v) => sum + (v.paid ? v.cost || 0 : 0), 0),
    pendingRevenue: visits.reduce((sum, v) => sum + (!v.paid ? v.cost || 0 : 0), 0),
  };
}
