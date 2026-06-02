export const CLINIC_NAME = process.env.CLINIC_NAME || "Dent Q Clinic";
export const CLINIC_TIMEZONE = process.env.CLINIC_TIMEZONE || "America/Aruba";
export const REMINDER_HOURS_BEFORE = Number(process.env.REMINDER_HOURS_BEFORE || "6");

/** Combina YYYY-MM-DD + HH:mm en Date local del servidor. */
export function parseAppointmentDateTime(dateStr, timeStr = "09:00") {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = (timeStr || "09:00").split(":").map(Number);
  return new Date(year, month - 1, day, hour || 0, minute || 0, 0, 0);
}

export function isMinuteTestVisit(visit) {
  return visit?.notifyUnit === "minutes";
}

/** Modo prueba: recordatorio N minutos después del registro. */
export function isMinuteReminderDue(visit, now = new Date()) {
  if (!isMinuteTestVisit(visit) || visit.sent5dPatient) return false;
  const createdAt = new Date(visit.createdAt);
  const notifyValue = visit.notifyValue || 1;
  const elapsedMs = now.getTime() - createdAt.getTime();
  return elapsedMs >= notifyValue * 60 * 1000;
}

/** Cita programada: recordatorio 6 h antes (o reminderHoursBefore del visit). */
export function isAppointmentReminderDue(visit, now = new Date()) {
  if (isMinuteTestVisit(visit) || visit.sent5dPatient) return false;
  const appointment = new Date(visit.followUpDate);
  if (Number.isNaN(appointment.getTime()) || appointment <= now) return false;

  const hoursBefore = visit.reminderHoursBefore ?? REMINDER_HOURS_BEFORE;
  const reminderAt = new Date(appointment.getTime() - hoursBefore * 60 * 60 * 1000);
  return now >= reminderAt;
}

export function isReminderDue(visit, now = new Date()) {
  if (isMinuteTestVisit(visit)) return isMinuteReminderDue(visit, now);
  return isAppointmentReminderDue(visit, now);
}

export function getReminderLeadLabel(visit) {
  if (isMinuteTestVisit(visit)) {
    const n = visit.notifyValue || 1;
    return n === 1 ? "1 minuto" : `${n} minutos`;
  }
  const h = visit.reminderHoursBefore ?? REMINDER_HOURS_BEFORE;
  return h === 1 ? "1 hora" : `${h} horas`;
}
