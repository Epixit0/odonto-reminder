import { normalizeChatId } from "@/lib/chatId";

const OPENWA_STATUS_HINTS = {
  disconnected:
    "La sesión está desconectada. En el dashboard de OpenWA pulsa Start y escanea el QR si aparece.",
  qr_ready:
    "Hay un QR pendiente. Abre el dashboard de OpenWA y escanea el código con WhatsApp.",
  created: "La sesión nunca se inició. En OpenWA pulsa Start en la sesión odontologia.",
  initializing: "La sesión está iniciando. Espera unos segundos e intenta de nuevo.",
  authenticating: "WhatsApp está autenticando. Espera unos segundos e intenta de nuevo.",
  failed: "La sesión falló. Revisa logs en Railway y vuelve a escanear el QR.",
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

  // Intentar resolver el chatId real consultando OpenWA
  // Después de enviar, el contacto ya está en caché, podemos obtener su ID real
  let resolvedChatId = null;
  try {
    const checkUrl = `${baseUrl.replace(/\/$/, "")}/api/sessions/${encodeURIComponent(sessionId)}/contacts/check/${to.replace(/\D/g, "")}`;
    const checkRes = await fetch(checkUrl, {
      headers: { "X-API-Key": apiKey },
    });
    if (checkRes.ok) {
      const checkData = await checkRes.json();
      const inner = checkData.data ?? checkData;
      // OpenWA: data.chatId; versiones antiguas: whatsappId (puede ser objeto wwebjs)
      resolvedChatId =
        normalizeChatId(inner.chatId) ||
        normalizeChatId(inner.whatsappId) ||
        normalizeChatId(checkData.chatId);
    }
  } catch (err) {
    // No es crítico, solo es para resolver el chatId
  }

  return { ok: true, messageId: body?.data?.messageId, resolvedChatId };
}

// Plantillas de mensajes por idioma
const messageTemplates = {
  es: {
    reminder5: (name, treatment, date) => 
      `🏥 *Clínica Dental - Recordatorio*\n\n` +
      `Hola ${name},\n\n` +
      `Le recordamos su cita de control odontológico:\n` +
      `📅 Fecha: ${date}\n` +
      `🦷 Tratamiento: ${treatment}\n\n` +
      `*Confirme su cita respondiendo solo una palabra:*\n` +
      `👉 Escriba *SI* para confirmar\n` +
      `👉 Escriba *NO* para cancelar\n\n` +
      `Gracias!`,
    
    reminder2: (name, treatment, date) =>
      `🏥 *Clínica Dental - Recordatorio*\n\n` +
      `Hola ${name},\n\n` +
      `*Faltan 2 días* para su cita de control odontológico:\n` +
      `📅 Fecha: ${date}\n` +
      `🦷 Tratamiento: ${treatment}\n\n` +
      `*Confirme su cita respondiendo solo una palabra:*\n` +
      `👉 Escriba *SI* para confirmar\n` +
      `👉 Escriba *NO* para cancelar\n\n` +
      `Gracias!`,
    
    ownerReminder: (name, phone, treatment, date, days) =>
      `📋 *Recordatorio de Cita*\n\n` +
      `Paciente: ${name}\n` +
      `📱 Teléfono: ${phone}\n` +
      `🦷 Tratamiento: ${treatment}\n` +
      `📅 Fecha: ${date}\n` +
      `⏰ Faltan: ${days}\n\n` +
      `Estado: ⏳ Esperando confirmación`,
  },
  
  en: {
    reminder5: (name, treatment, date) =>
      `🏥 *Dental Clinic - Reminder*\n\n` +
      `Hi ${name},\n\n` +
      `This is a reminder for your dental checkup:\n` +
      `📅 Date: ${date}\n` +
      `🦷 Treatment: ${treatment}\n\n` +
      `*Confirm your appointment with one word only:*\n` +
      `👉 Reply *YES* to confirm\n` +
      `👉 Reply *NO* to cancel\n\n` +
      `Thank you!`,
    
    reminder2: (name, treatment, date) =>
      `🏥 *Dental Clinic - Reminder*\n\n` +
      `Hi ${name},\n\n` +
      `*2 days left* until your dental checkup:\n` +
      `📅 Date: ${date}\n` +
      `🦷 Treatment: ${treatment}\n\n` +
      `*Confirm your appointment with one word only:*\n` +
      `👉 Reply *YES* to confirm\n` +
      `👉 Reply *NO* to cancel\n\n` +
      `Thank you!`,
    
    ownerReminder: (name, phone, treatment, date, days) =>
      `📋 *Appointment Reminder*\n\n` +
      `Patient: ${name}\n` +
      `📱 Phone: ${phone}\n` +
      `🦷 Treatment: ${treatment}\n` +
      `📅 Date: ${date}\n` +
      `⏰ In: ${days}\n\n` +
      `Status: ⏳ Waiting for confirmation`,
  },
  
  pap: {
    reminder5: (name, treatment, date) =>
      `🏥 *Clinica Dental - Recordatorio*\n\n` +
      `Bon dia ${name},\n\n` +
      `Nos ta recorda bo cita di control dental:\n` +
      `📅 Fecha: ${date}\n` +
      `🦷 Tratament: ${treatment}\n\n` +
      `*Confirma bo cita contestando por ejemplo:*\n` +
      `👉 *SI*, *SI porfabor*, *SI danki*\n` +
      `👉 *NO*, *NO danki*, *no ta pudi*\n\n` +
      `Danki!`,
    
    reminder2: (name, treatment, date) =>
      `🏥 *Clinica Dental - Recordatorio*\n\n` +
      `Bon dia ${name},\n\n` +
      `*Falta 2 dia* pa bo cita di control dental:\n` +
      `📅 Fecha: ${date}\n` +
      `🦷 Tratament: ${treatment}\n\n` +
      `*Confirma bo cita contestando por ejemplo:*\n` +
      `👉 *SI*, *SI porfabor*, *SI danki*\n` +
      `👉 *NO*, *NO danki*, *no ta pudi*\n\n` +
      `Danki!`,
    
    ownerReminder: (name, phone, treatment, date, days) =>
      `📋 *Recordatorio di Cita*\n\n` +
      `Paciente: ${name}\n` +
      `📱 Telefòn: ${phone}\n` +
      `🦷 Tratament: ${treatment}\n` +
      `📅 Fecha: ${date}\n` +
      `⏰ Falta: ${days}\n\n` +
      `Status: ⏳ Esperando confirmacion`,
  },
};

// Formatear fecha según idioma
function formatDate(date, language = "es") {
  const locales = { es: "es-ES", en: "en-US", pap: "pap-AW" };
  return new Date(date).toLocaleDateString(locales[language] || "es-ES", {
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Enviar recordatorio al paciente
export async function sendReminderToPatient(visit, daysBefore, unit = "days") {
  const lang = messageTemplates[visit.language] ? visit.language : "es";
  const templates = messageTemplates[lang];
  
  const dateStr = formatDate(visit.followUpDate, visit.language);
  const daysText = unit === "minutes" ? `${daysBefore} minutos` : `${daysBefore} días`;
  
  const message = daysBefore === 5 || daysBefore === 2
    ? templates.reminder5(visit.patientName, visit.treatmentType, dateStr)
    : templates.reminder2(visit.patientName, visit.treatmentType, dateStr);

  return sendWhatsAppMessage(visit.patientPhone, message);
}

// Enviar recordatorio al odontólogo
export async function sendReminderToOwner(visit, daysBefore, unit = "days") {
  const ownerPhone = process.env.OWNER_WHATSAPP_PHONE;
  if (!ownerPhone) {
    console.log("⚠️ OWNER_WHATSAPP_PHONE no configurado");
    return { ok: false, reason: "no_owner_phone" };
  }

  const lang = messageTemplates[visit.language] ? visit.language : "es";
  const templates = messageTemplates[lang];
  
  const dateStr = formatDate(visit.followUpDate, visit.language);
  const daysText = unit === "minutes" ? `${daysBefore} minutos` : `${daysBefore} días`;

  const message = templates.ownerReminder(
    visit.patientName,
    visit.patientPhone,
    visit.treatmentType,
    dateStr,
    daysText
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

  const dateStr = formatDate(visit.followUpDate, visit.language);
  
  const message = `📋 *${visit.language === "en" ? "Patient Response" : visit.language === "pap" ? "Responsa di Paciente" : "Respuesta de Paciente"}*\n\n` +
    `${visit.patientName} ${status === "confirmed" 
      ? (visit.language === "en" ? "has" : "ha") 
      : (visit.language === "en" ? "has" : "ha")} *${statusText}* ${visit.language === "en" ? "their appointment" : visit.language === "pap" ? "su cita" : "su cita"}.\n\n` +
    `📅 ${visit.language === "en" ? "Date" : visit.language === "pap" ? "Fecha" : "Fecha"}: ${dateStr}\n` +
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
      confirmed: "✅ *¡Gracias!*\n\nSu cita ha sido confirmada. Lo esperamos en la clínica.\n\nSi necesita cancelar, responda CANCELAR.",
      cancelled: "❌ *Cita cancelada*\n\nSu cita ha sido cancelada. Para reagendar, por favor contacte a la clínica."
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
