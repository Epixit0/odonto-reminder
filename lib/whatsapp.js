import { normalizeChatId, extractChatIdFromMessageId } from "@/lib/chatId";
import { CLINIC_NAME, isMinuteTestVisit, getReminderLeadLabel } from "@/lib/reminders";
import { formatAppointmentDateTime } from "@/lib/formatAppointment";

const OPENWA_STATUS_HINTS = {
  disconnected:
    "La sesión está desconectada. En el dashboard de OpenWA pulsa Start y escanea el QR si aparece.",
  qr_ready:
    "Hay un QR pendiente. Abre el dashboard de OpenWA y escanea el código con WhatsApp.",
  created: "La sesión nunca se inició. En OpenWA pulsa Start en la sesión odontologia.",
  initializing: "La sesión está iniciando. Espera unos segundos e intenta de nuevo.",
  authenticating: "WhatsApp está autenticando. Espera unos segundos e intenta de nuevo.",
  failed:
    "La sesión falló (motor zombie). En el dashboard: Stop → Start, o corre: curl -X POST .../stop luego .../start. Si pide QR, escanéalo.",
};

function openWaHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    "X-API-Key": apiKey,
  };
}

function formatOpenWaError(body, status) {
  const code = body?.error?.code;
  const message = body?.error?.message || body?.message || "Error desconocido";
  const details = body?.error?.details;
  const detailText =
    details && typeof details === "object"
      ? ` (${JSON.stringify(details)})`
      : "";
  return `Error enviando WhatsApp (OpenWA) [${status}${code ? ` / ${code}` : ""}]: ${message}${detailText}`;
}

async function fetchOpenWaSession(baseUrl, sessionId, apiKey) {
  const url = `${baseUrl.replace(/\/$/, "")}/api/sessions/${encodeURIComponent(sessionId)}`;
  const res = await fetch(url, { headers: { "X-API-Key": apiKey } });
  const raw = await res.text();
  let body = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = { message: raw };
  }
  const session = body?.data ?? body;
  return { ok: res.ok, status: res.status, session, body };
}

async function ensureOpenWaSessionReady(baseUrl, sessionId, apiKey) {
  const { ok, status, session, body } = await fetchOpenWaSession(
    baseUrl,
    sessionId,
    apiKey,
  );

  if (!ok) {
    if (status === 404) {
      throw new Error(
        `Error enviando WhatsApp (OpenWA): sesión '${sessionId}' no existe. ` +
          "Actualiza OPENWA_SESSION_ID en Vercel con el ID del dashboard de OpenWA.",
      );
    }
    throw new Error(formatOpenWaError(body, status));
  }

  const sessionStatus = String(session?.status || "").toLowerCase();
  if (sessionStatus && sessionStatus !== "ready") {
    const hint = OPENWA_STATUS_HINTS[sessionStatus] || "Revisa el estado en el dashboard de OpenWA.";
    throw new Error(
      `Error enviando WhatsApp (OpenWA): sesión en estado '${sessionStatus}'. ${hint}`,
    );
  }
}

function toChatId(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) {
    throw new Error("Número de teléfono inválido");
  }
  return `${digits}@c.us`;
}

export async function sendWhatsAppMessage(to, text, sessionIdOverride) {
  const baseUrl = process.env.OPENWA_API_URL || "http://localhost:2785";
  const sessionId = sessionIdOverride || process.env.OPENWA_SESSION_ID;
  const apiKey = process.env.OPENWA_API_KEY;

  if (!sessionId || !apiKey) {
    console.warn("OpenWA no configurado. Mensaje simulado:", { to, text });
    return { ok: false, simulated: true };
  }

  await ensureOpenWaSessionReady(baseUrl, sessionId, apiKey);

  const url = `${baseUrl.replace(/\/$/, "")}/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`;

  const res = await fetch(url, {
    method: "POST",
    headers: openWaHeaders(apiKey),
    body: JSON.stringify({
      chatId: toChatId(to),
      text,
    }),
  });

  const raw = await res.text();
  let body = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    body = { message: raw };
  }

  if (!res.ok) {
    throw new Error(formatOpenWaError(body, res.status));
  }

  if (body.success === false) {
    throw new Error(
      `Error enviando WhatsApp (OpenWA): ${body?.error?.message || "respuesta fallida"}`,
    );
  }

  const messageId = body?.data?.messageId ?? body?.messageId;
  let resolvedChatId = extractChatIdFromMessageId(messageId);

  // Intentar resolver el chatId real consultando OpenWA
  try {
    const checkUrl = `${baseUrl.replace(/\/$/, "")}/api/sessions/${encodeURIComponent(sessionId)}/contacts/check/${to.replace(/\D/g, "")}`;
    const checkRes = await fetch(checkUrl, {
      headers: { "X-API-Key": apiKey },
    });
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      const inner = checkData.data ?? checkData;
      resolvedChatId =
        resolvedChatId ||
        normalizeChatId(inner.chatId) ||
        normalizeChatId(inner.id) ||
        normalizeChatId(inner.whatsappId) ||
        normalizeChatId(checkData.chatId);
    }
  } catch {
    // No es crítico
  }

  return { ok: true, messageId, resolvedChatId };
}

// Plantillas de mensajes por idioma — {clinic} Dent Q Clinic
const messageTemplates = {
  es: {
    reminder: (name, treatment, dateStr, timeStr, leadLabel, isTest) =>
      `🏥 *${CLINIC_NAME} - Recordatorio*\n\n` +
      `Hola ${name},\n\n` +
      `Le recordamos su cita:\n` +
      `📅 ${dateStr}\n` +
      `🕐 Hora: ${timeStr}\n` +
      `🦷 Tratamiento: ${treatment}\n\n` +
      (isTest
        ? `*(Mensaje de prueba — ${leadLabel} después del registro)*\n\n`
        : `*(Recordatorio con ${leadLabel} de anticipación)*\n\n`) +
      `*Confirme su cita respondiendo:*\n` +
      `👉 Escriba *SI* para confirmar\n` +
      `👉 Escriba *NO* para cancelar\n\n` +
      `Gracias!`,

    ownerReminder: (name, phone, treatment, dateStr, timeStr, leadLabel) =>
      `📋 *${CLINIC_NAME} - Recordatorio de Cita*\n\n` +
      `Paciente: ${name}\n` +
      `📱 Teléfono: ${phone}\n` +
      `🦷 Tratamiento: ${treatment}\n` +
      `📅 ${dateStr}\n` +
      `🕐 Hora: ${timeStr}\n` +
      `⏰ Anticipación: ${leadLabel}\n\n` +
      `Estado: ⏳ Esperando confirmación`,
  },

  en: {
    reminder: (name, treatment, dateStr, timeStr, leadLabel, isTest) =>
      `🏥 *${CLINIC_NAME} - Reminder*\n\n` +
      `Hi ${name},\n\n` +
      `This is a reminder for your appointment:\n` +
      `📅 ${dateStr}\n` +
      `🕐 Time: ${timeStr}\n` +
      `🦷 Treatment: ${treatment}\n\n` +
      (isTest
        ? `*(Test message — ${leadLabel} after registration)*\n\n`
        : `*(${leadLabel} advance reminder)*\n\n`) +
      `*Confirm your appointment:*\n` +
      `👉 Reply *YES* to confirm\n` +
      `👉 Reply *NO* to cancel\n\n` +
      `Thank you!`,

    ownerReminder: (name, phone, treatment, dateStr, timeStr, leadLabel) =>
      `📋 *${CLINIC_NAME} - Appointment Reminder*\n\n` +
      `Patient: ${name}\n` +
      `📱 Phone: ${phone}\n` +
      `🦷 Treatment: ${treatment}\n` +
      `📅 ${dateStr}\n` +
      `🕐 Time: ${timeStr}\n` +
      `⏰ Lead time: ${leadLabel}\n\n` +
      `Status: ⏳ Waiting for confirmation`,
  },

  pap: {
    reminder: (name, treatment, dateStr, timeStr, leadLabel, isTest) =>
      `🏥 *${CLINIC_NAME} - Recordatorio*\n\n` +
      `Bon dia ${name},\n\n` +
      `Nos ta recorda bo cita:\n` +
      `📅 ${dateStr}\n` +
      `🕐 Ora: ${timeStr}\n` +
      `🦷 Tratament: ${treatment}\n\n` +
      (isTest
        ? `*(Mensashi di prueba — ${leadLabel} despues di registro)*\n\n`
        : `*(Recordatorio ${leadLabel} promé)*\n\n`) +
      `*Confirma bo cita:*\n` +
      `👉 *SI* pa confirma\n` +
      `👉 *NO* pa cancela\n\n` +
      `Danki!`,

    ownerReminder: (name, phone, treatment, dateStr, timeStr, leadLabel) =>
      `📋 *${CLINIC_NAME} - Recordatorio di Cita*\n\n` +
      `Paciente: ${name}\n` +
      `📱 Telefòn: ${phone}\n` +
      `🦷 Tratament: ${treatment}\n` +
      `📅 ${dateStr}\n` +
      `🕐 Ora: ${timeStr}\n` +
      `⏰ Promé: ${leadLabel}\n\n` +
      `Status: ⏳ Esperando confirmacion`,
  },
};

// Enviar recordatorio al paciente
export async function sendReminderToPatient(visit) {
  const lang = messageTemplates[visit.language] ? visit.language : "es";
  const templates = messageTemplates[lang];
  const { dateStr, timeStr } = formatAppointmentDateTime(visit.followUpDate, visit.language);
  const leadLabel = getReminderLeadLabel(visit);
  const isTest = isMinuteTestVisit(visit);

  const message = templates.reminder(
    visit.patientName,
    visit.treatmentType,
    dateStr,
    timeStr,
    leadLabel,
    isTest,
  );

  return sendWhatsAppMessage(visit.patientPhone, message);
}

// Enviar recordatorio al odontólogo
export async function sendReminderToOwner(visit) {
  const ownerPhone = process.env.OWNER_WHATSAPP_PHONE;
  if (!ownerPhone) {
    console.log("⚠️ OWNER_WHATSAPP_PHONE no configurado");
    return { ok: false, reason: "no_owner_phone" };
  }

  const lang = messageTemplates[visit.language] ? visit.language : "es";
  const templates = messageTemplates[lang];
  const { dateStr, timeStr } = formatAppointmentDateTime(visit.followUpDate, visit.language);
  const leadLabel = getReminderLeadLabel(visit);

  const message = templates.ownerReminder(
    visit.patientName,
    visit.patientPhone,
    visit.treatmentType,
    dateStr,
    timeStr,
    leadLabel,
  );

  return sendWhatsAppMessage(ownerPhone, message);
}

// Notificar al odontólogo de respuesta del paciente
export async function notifyOwnerOfResponse(visit, status) {
  const ownerPhone = process.env.OWNER_WHATSAPP_PHONE;
  if (!ownerPhone) return { ok: false, reason: "no_owner_phone" };

  const statusEmoji = status === "confirmed" ? "✅" : "❌";
  const statusText = status === "confirmed" 
    ? (visit.language === "en" ? "CONFIRMED" : visit.language === "pap" ? "CONFIRMA" : "CONFIRMADO")
    : (visit.language === "en" ? "CANCELLED" : visit.language === "pap" ? "CANCELA" : "CANCELADO");

  const { dateStr, timeStr } = formatAppointmentDateTime(visit.followUpDate, visit.language);

  const message = `📋 *${CLINIC_NAME} - ${visit.language === "en" ? "Patient Response" : visit.language === "pap" ? "Responsa di Paciente" : "Respuesta de Paciente"}*\n\n` +
    `${visit.patientName} ${status === "confirmed" 
      ? (visit.language === "en" ? "has" : "ha") 
      : (visit.language === "en" ? "has" : "ha")} *${statusText}* ${visit.language === "en" ? "their appointment" : visit.language === "pap" ? "su cita" : "su cita"}.\n\n` +
    `📅 ${visit.language === "en" ? "Date" : visit.language === "pap" ? "Fecha" : "Fecha"}: ${dateStr}\n` +
    `🕐 ${visit.language === "en" ? "Time" : visit.language === "pap" ? "Ora" : "Hora"}: ${timeStr}\n` +
    `📱 ${visit.language === "en" ? "Phone" : visit.language === "pap" ? "Telefòn" : "Teléfono"}: ${visit.patientPhone}\n` +
    `🦷 ${visit.language === "en" ? "Treatment" : visit.language === "pap" ? "Tratament" : "Tratamiento"}: ${visit.treatmentType}\n\n` +
    `${statusEmoji} ${statusText}\n\n` +
    `${status === "cancelled" 
      ? (visit.language === "en" 
          ? "⚠️ Patient cancelled. Consider rescheduling." 
          : visit.language === "pap" 
            ? "⚠️ Paciente a cancela. Considera reagenda." 
            : "⚠️ El paciente canceló. Considere reagendar.")
      : (visit.language === "en"
          ? "✅ All set for the appointment."
          : visit.language === "pap"
            ? "✅ Todo listo pa e cita."
            : "✅ Todo listo para la cita.")}`;

  return sendWhatsAppMessage(ownerPhone, message);
}

// Responder al paciente confirmando su respuesta
export async function sendConfirmationResponse(phone, status, language = "es") {
  const messages = {
    es: {
      confirmed: `✅ *¡Gracias!*\n\nSu cita en *${CLINIC_NAME}* ha sido confirmada. Lo esperamos.\n\nSi necesita cancelar, responda NO.`,
      cancelled: `❌ *Cita cancelada*\n\nSu cita en *${CLINIC_NAME}* ha sido cancelada. Para reagendar, contacte a la clínica.`,
    },
    en: {
      confirmed: "✅ *Thank you!*\n\nYour appointment has been confirmed. We look forward to seeing you.\n\nIf you need to cancel, reply CANCEL.",
      cancelled: "❌ *Appointment cancelled*\n\nYour appointment has been cancelled. To reschedule, please contact the clinic."
    },
    pap: {
      confirmed: "✅ *Danki!*\n\nSu cita a keda confirma. Nos ta espera den clinica.\n\nSi mester cancela, contesta CANCEL.",
      cancelled: "❌ *Cita cancela*\n\nSu cita a keda cancela. Pa reagenda, porfabor contacta clinica."
    }
  };

  const lang = messages[language] ? language : "es";
  const message = messages[lang][status];

  return sendWhatsAppMessage(phone, message);
}
