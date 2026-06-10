import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";
import Patient from "@/models/Patient";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { normalizeChatId, phoneDigitsFromChatId, phoneTailDigits } from "@/lib/chatId";
import { resolvePhoneFromChatId } from "@/lib/openwaContacts";
import { findPendingVisit, canAcceptPatientReply } from "@/lib/visitMatching";
import { parseConfirmationIntent, getUnrecognizedReplyMessage } from "@/lib/confirmationIntent";
import { CLINIC_NAME } from "@/lib/reminders";
import { formatAppointmentDateTime } from "@/lib/formatAppointment";
import { verifyWebhookSignature } from "@/lib/webhook-verify";
import { sanitizeWhatsAppBody } from "@/lib/sanitize";
import { createLogger } from "@/lib/logger";
import { logAudit } from "@/lib/audit";

const log = createLogger("api/webhooks/whatsapp");

function extractIncomingText(payload) {
  if (!payload) return null;
  const raw =
    payload.body ??
    payload.text ??
    payload.message ??
    payload.caption ??
    payload.selectedButtonId ??
    payload.buttonText ??
    payload.listResponse?.title ??
    null;

  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && typeof raw.body === "string") return raw.body;
  return raw != null ? String(raw) : null;
}

function formatVisitDateTime(visit) {
  const { dateStr, timeStr } = formatAppointmentDateTime(visit.followUpDate, visit.language || "es");
  return `${dateStr} · ${timeStr}`;
}

async function notifyOwnerOfResponse(visit, status, sessionId) {
  const ownerPhone = process.env.OWNER_WHATSAPP_PHONE;
  if (!ownerPhone) return;
  const emoji = status === "confirmed" ? "✅" : "❌";
  const text = status === "confirmed" ? "CONFIRMADO" : "CANCELADO";
  const message = `📋 *${CLINIC_NAME} - Respuesta de Paciente*\n\n${visit.patientName} ha *${text}* su cita.\n📅 ${formatVisitDateTime(visit)}\n📱 Teléfono: ${visit.patientPhone}\n🦷 Tratamiento: ${visit.treatmentType}\n\n${emoji} ${text}`;
  try {
    await sendWhatsAppMessage(ownerPhone, message, sessionId);
  } catch (error) {
    log.error(error, "Error notificando al odontólogo");
  }
}

async function respondToPatient(phone, status, language = "es", sessionId) {
  const messages = {
    es: {
      confirmed: `✅ *¡Gracias!*\n\nSu cita en *${CLINIC_NAME}* ha sido confirmada. Lo esperamos.`,
      cancelled: `❌ *Cita cancelada*\n\nSu cita en *${CLINIC_NAME}* ha sido cancelada. Para reagendar, contacte a la clínica.`,
    },
    en: {
      confirmed: `✅ *Thank you!*\n\nYour appointment at *${CLINIC_NAME}* has been confirmed.`,
      cancelled: `❌ *Appointment cancelled*\n\nYour appointment at *${CLINIC_NAME}* has been cancelled. To reschedule, please contact the clinic.`,
    },
    pap: {
      confirmed: `✅ *Danki!*\n\nBo cita na *${CLINIC_NAME}* a keda confirma.`,
      cancelled: `❌ *Cita cancela*\n\nBo cita na *${CLINIC_NAME}* a keda cancela. Pa reagenda, contacta clinica.`,
    },
  };
  const lang = messages[language] ? language : "es";
  try {
    await sendWhatsAppMessage(phone, messages[lang][status], sessionId);
  } catch (error) {
    log.error(error, "Error respondiendo al paciente");
  }
}

async function sendUnrecognizedReply(visit, sessionId) {
  const message = getUnrecognizedReplyMessage(visit.language || "es");
  await sendWhatsAppMessage(visit.patientPhone, message, sessionId);
}

export async function POST(request) {
  try {
    // 1. Verificar firma HMAC del webhook
    const rawBody = await request.text();
    const signature = request.headers.get("x-webhook-signature");
    
    // Parse manual para no consumir el body dos veces
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!verifyWebhookSignature(rawBody, signature)) {
      log.warn("Webhook rechazado — firma inválida");
      return Response.json({ error: "Invalid signature" }, { status: 401 });
    }

    // OpenWA envía: { event, sessionId, data: { from, body, ... } }
    const payload = body.data ?? body.payload?.data ?? body;

    if (payload.isGroup === true) {
      return Response.json({ ok: true, message: "Ignored (group message)" });
    }

    if (payload.fromMe === true) {
      return Response.json({ ok: true, message: "Ignored (from me)" });
    }

    const fromChatId = normalizeChatId(
      payload.from ?? payload.chatId ?? payload.author,
    );
    const rawText = extractIncomingText(payload);
    const text = sanitizeWhatsAppBody(rawText || "");
    const sessionId =
      body.sessionId || payload.sessionId || process.env.OPENWA_SESSION_ID;

    if (!fromChatId || !text) {
      return Response.json({ ok: true, message: "Ignored (no data)" });
    }

    log.info({ from: fromChatId, text }, "Mensaje entrante");

    const intent = parseConfirmationIntent(text);

    await connectDB();

    let phoneDigits = phoneDigitsFromChatId(fromChatId);
    let resolvedChatId = fromChatId;

    if ((!phoneDigits || phoneDigits.length < 8) && sessionId) {
      const contactInfo = await resolvePhoneFromChatId(sessionId, fromChatId);
      if (contactInfo?.number) {
        phoneDigits = phoneTailDigits(contactInfo.number, 10);
        log.info({ phoneDigits }, "Teléfono resuelto vía OpenWA");
      }
      if (contactInfo?.chatId) {
        resolvedChatId = contactInfo.chatId;
      }
    }

    let visit = await findPendingVisit({ fromChatId, phoneDigits, resolvedChatId });

    if (!visit) {
      log.warn({ fromChatId, phoneDigits }, "Sin visita pendiente");
      return Response.json({ ok: true, message: "No pending visit found" });
    }

    if (!canAcceptPatientReply(visit)) {
      log.warn({ patientName: visit.patientName, chatId: fromChatId }, "Paciente respondió antes del recordatorio");
      return Response.json({ ok: true, message: "Reminder not sent yet — ignored" });
    }

    if (!intent) {
      log.info({ text }, "Sin intención clara");
      await sendUnrecognizedReply(visit, sessionId);
      return Response.json({ ok: true, message: "No intent detected" });
    }

    log.info({ patientName: visit.patientName, intent }, "Intención detectada");

    visit.confirmationStatus = intent;
    visit.patientResponse = text;
    visit.respondedAt = new Date();
    visit.patientChatId = fromChatId;
    await visit.save();

    // Log de auditoría
    await logAudit({
      action: intent === "confirmed" ? "confirm" : "cancel",
      resource: "visit",
      resourceId: visit._id,
      details: { patientName: visit.patientName, response: text },
      username: visit.patientName,
    });

    if (visit.patientId) {
      await Patient.findByIdAndUpdate(visit.patientId, { lastActivity: new Date() });
    }

    await respondToPatient(visit.patientPhone, intent, visit.language, sessionId);
    await notifyOwnerOfResponse(visit, intent, sessionId);

    return Response.json({
      ok: true,
      message: `Visit updated to ${intent}`,
      patient: visit.patientName,
    });
  } catch (error) {
    log.error(error, "Error en webhook");
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("challenge")) {
    return new Response(searchParams.get("challenge"), { status: 200 });
  }
  return Response.json({ ok: true, message: "Webhook is active" });
}
