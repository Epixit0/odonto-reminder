function toChatId(phone) {
  const digits = String(phone).replace(/\D/g, "");
  if (!digits) {
    throw new Error("Número de teléfono inválido");
  }
  return `${digits}@c.us`;
}

export async function sendWhatsAppMessage(to, text) {
  const baseUrl = process.env.OPENWA_API_URL || "http://localhost:2785";
  const sessionId = process.env.OPENWA_SESSION_ID;
  const apiKey = process.env.OPENWA_API_KEY;

  if (!sessionId || !apiKey) {
    console.warn("OpenWA no configurado. Mensaje simulado:", { to, text });
    return { ok: false, simulated: true };
  }

  const url = `${baseUrl.replace(/\/$/, "")}/api/sessions/${encodeURIComponent(sessionId)}/messages/send-text`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
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
    const message = body?.error?.message || body?.message || raw;
    throw new Error(`Error enviando WhatsApp (OpenWA): ${message || res.status}`);
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
      // whatsappId es el chatId real: "584121985398@c.us" o "251573733195975@lid"
      if (checkData.whatsappId) {
        resolvedChatId = checkData.whatsappId;
      }
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
      `*Por favor confirme su asistencia respondiendo:*\n` +
      `✅ SI - Para confirmar\n` +
      `❌ NO - Para cancelar\n\n` +
      `Gracias!`,
    
    reminder2: (name, treatment, date) =>
      `🏥 *Clínica Dental - Recordatorio*\n\n` +
      `Hola ${name},\n\n` +
      `*Faltan 2 días* para su cita de control odontológico:\n` +
      `📅 Fecha: ${date}\n` +
      `🦷 Tratamiento: ${treatment}\n\n` +
      `*Por favor confirme su asistencia respondiendo:*\n` +
      `✅ SI - Para confirmar\n` +
      `❌ NO - Para cancelar\n\n` +
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
      `*Please confirm your attendance by replying:*\n` +
      `✅ YES - To confirm\n` +
      `❌ NO - To cancel\n\n` +
      `Thank you!`,
    
    reminder2: (name, treatment, date) =>
      `🏥 *Dental Clinic - Reminder*\n\n` +
      `Hi ${name},\n\n` +
      `*2 days left* until your dental checkup:\n` +
      `📅 Date: ${date}\n` +
      `🦷 Treatment: ${treatment}\n\n` +
      `*Please confirm your attendance by replying:*\n` +
      `✅ YES - To confirm\n` +
      `❌ NO - To cancel\n\n` +
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
      `*Porfabor confirma bo asistencia contesta:*\n` +
      `✅ SI - Pa confirma\n` +
      `❌ NO - Pa cancela\n\n` +
      `Danki!`,
    
    reminder2: (name, treatment, date) =>
      `🏥 *Clinica Dental - Recordatorio*\n\n` +
      `Bon dia ${name},\n\n` +
      `*Falta 2 dia* pa bo cita di control dental:\n` +
      `📅 Fecha: ${date}\n` +
      `🦷 Tratament: ${treatment}\n\n` +
      `*Porfabor confirma bo asistencia contesta:*\n` +
      `✅ SI - Pa confirma\n` +
      `❌ NO - Pa cancela\n\n` +
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
