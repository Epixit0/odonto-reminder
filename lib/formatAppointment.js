import { CLINIC_TIMEZONE } from "@/lib/reminders";

export function formatAppointmentDateTime(date, language = "es") {
  const locales = { es: "es-ES", en: "en-US", pap: "es-ES" };
  const locale = locales[language] || "es-ES";
  const d = new Date(date);

  const dateStr = d.toLocaleDateString(locale, {
    timeZone: CLINIC_TIMEZONE,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const timeStr = d.toLocaleTimeString(locale, {
    timeZone: CLINIC_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return { dateStr, timeStr };
}
