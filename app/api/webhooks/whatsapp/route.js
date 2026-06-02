import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";
import Patient from "@/models/Patient";
import { sendWhatsAppMessage } from "@/lib/whatsapp";
import { normalizeChatId, phoneDigitsFromChatId, phoneTailDigits } from "@/lib/chatId";
import { resolvePhoneFromChatId } from "@/lib/openwaContacts";
import { findPendingVisit } from "@/lib/visitMatching";
import { parseConfirmationIntent, getUnrecognizedReplyMessage } from "@/lib/confirmationIntent";

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

function formatDate(date) {
  return new Date(date).toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function notifyOwnerOfResponse(visit, status, sessionId) {
  const ownerPhone = process.env.OWNER_WHATSAPP_PHONE;
  if (!ownerPhone) return;
  const emoji = status === "confirmed" ? "✅" : "❌";
  const text = status === "confirmed" ? "CONFIRMADO" : "CANCELADO";
  const message = `📋 *Respuesta de Paciente*\n\n${visit.patientName} ha *${text}* su cita.\n📅 Fecha: ${formatDate(visit.followUpDate)}\n📱 Teléfono: ${visit.patientPhone}\n🦷 Tratamiento: ${visit.treatmentType}\n\n${emoji} ${text}`;
  try {
    await sendWhatsAppMessage(ownerPhone, message, sessionId);
  } catch (error) {
    console.error("❌ Error notificando al odontólogo:", error);
  }
}

async function respondToPatient(phone, status, language = "es", sessionId) {
  const messages = {
    es: {
      confirmed: "✅ *¡Gracias!*\n\nSu cita ha sido confirmada. Lo esperamos en la clínica.",
      cancelled: "❌ *Cita cancelada*\n\nSu cita ha sido cancelada. Para reagendar, contacte a la clínica.",
    },
    en: {
      confirmed: "✅ *Thank you!*\n\nYour appointment has been confirmed.",
      cancelled: "❌ *Appointment cancelled*\n\nTo reschedule, please contact the clinic.",
    },
    pap: {
      confirmed: "✅ *Danki!*\n\nSu cita a keda confirma.",
      cancelled: "❌ *Cita cancela*\n\nPa reagenda, contacta clinica.",
    },
  };
  const lang = messages[language] ? language : "es";
  try {
    await sendWhatsAppMessage(phone, messages[lang][status], sessionId);
  } catch (error) {
    console.error("❌ Error respondiendo al paciente:", error);
  }
}

async function sendUnrecognizedReply(visit, sessionId) {
  const message = getUnrecognizedReplyMessage(visit.language || "es");
  await sendWhatsAppMessage(visit.patientPhone, message, sessionId);
}

export async function POST(request) {
  try {
    const body = await request.json();
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
    const text = extractIncomingText(payload);
    const sessionId =
      body.sessionId || payload.sessionId || process.env.OPENWA_SESSION_ID;

    if (!fromChatId || !text) {
      return Response.json({ ok: true, message: "Ignored (no data)" });
    }

    console.log(`📩 Mensaje de: ${fromChatId} — "${text}"`);

    const intent = parseConfirmationIntent(text);

    await connectDB();

    let phoneDigits = phoneDigitsFromChatId(fromChatId);
    let resolvedChatId = fromChatId;

    if ((!phoneDigits || phoneDigits.length < 8) && sessionId) {
      const contactInfo = await resolvePhoneFromChatId(sessionId, fromChatId);
      if (contactInfo?.number) {
        phoneDigits = phoneTailDigits(contactInfo.number, 10);
        console.log(`📞 Teléfono resuelto vía OpenWA: ...${phoneDigits}`);
      }
      if (contactInfo?.chatId) {
        resolvedChatId = contactInfo.chatId;
      }
    }

    let visit = await findPendingVisit({ fromChatId, phoneDigits, resolvedChatId });

    if (!visit) {
      console.log(`⚠️ Sin visita pendiente (chatId=${fromChatId}, dígitos=...${phoneDigits || "?"})`);
      if (!intent) {
        return Response.json({ ok: true, message: "No pending visit found" });
      }
      return Response.json({ ok: true, message: "No pending visit found" });
    }

    if (!intent) {
      console.log(`🤔 Sin intención clara: "${text}"`);
      await sendUnrecognizedReply(visit, sessionId);
      return Response.json({ ok: true, message: "No intent detected" });
    }

    console.log(`🎯 ${visit.patientName} → ${intent}`);

    visit.confirmationStatus = intent;
    visit.patientResponse = text;
    visit.respondedAt = new Date();
    visit.patientChatId = fromChatId;
    await visit.save();

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
    console.error("❌ Error en webhook:", error);
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
