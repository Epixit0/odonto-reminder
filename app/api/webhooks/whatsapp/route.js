import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

// Obtener número real desde OpenWA usando contact/check
async function resolvePhoneFromChatId(sessionId, chatId) {
  const baseUrl = process.env.OPENWA_API_URL;
  const apiKey = process.env.OPENWA_API_KEY;
  if (!baseUrl || !apiKey) return null;

  try {
    const res = await fetch(
      `${baseUrl}/api/sessions/${sessionId}/contacts/check/${chatId}`,
      { headers: { "X-API-Key": apiKey } }
    );
    if (!res.ok) {
      console.log(`⚠️ contact/check falló: ${res.status}`);
      return null;
    }
    const data = await res.json();
    console.log("📞 Contact check response:", JSON.stringify(data, null, 2));
    return data;
  } catch (err) {
    console.error("❌ Error resolviendo contacto:", err);
    return null;
  }
}

// Parser de intenciones del paciente
function parseConfirmationIntent(text) {
  if (!text) return null;
  
  const normalized = text.toLowerCase().trim();
  
  const confirmWords = [
    "si", "sí", "yes", "ok", "okay", "confirmo", "confirmado", 
    "asistiré", "asistire", "voy", "perfecto", "bien", "dale", 
    "correcto", "claro", "por supuesto"
  ];
  
  const cancelWords = [
    "no", "cancelo", "cancelado", "no puedo", "no voy", "cancelar",
    "anular", "anulo", "imposible", "otro día", "otro dia", "reagendar"
  ];
  
  if (confirmWords.some(word => normalized.includes(word))) {
    return "confirmed";
  }
  
  if (cancelWords.some(word => normalized.includes(word))) {
    return "cancelled";
  }
  
  return null;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

async function notifyOwnerOfResponse(visit, status) {
  const ownerPhone = process.env.OWNER_WHATSAPP_PHONE;
  if (!ownerPhone) return;

  const statusEmoji = status === "confirmed" ? "✅" : "❌";
  const statusText = status === "confirmed" ? "CONFIRMADO" : "CANCELADO";

  const message = `📋 *Respuesta de Paciente*

${visit.patientName} ha *${statusText}* su cita.

📅 Fecha: ${formatDate(visit.followUpDate)}
📱 Teléfono: ${visit.patientPhone}
🦷 Tratamiento: ${visit.treatmentType}

Estado: ${statusEmoji} ${statusText}

${status === "cancelled" ? "⚠️ El paciente canceló. Considere reagendar." : "✅ Todo listo para la cita."}`;

  try {
    await sendWhatsAppMessage(ownerPhone, message);
    console.log(`✅ Notificación enviada al odontólogo sobre ${visit.patientName}`);
  } catch (error) {
    console.error("❌ Error notificando al odontólogo:", error);
  }
}

async function respondToPatient(phone, status, language = "es") {
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

  try {
    await sendWhatsAppMessage(phone, message);
    console.log(`✅ Respuesta enviada al paciente (${lang}): ${status}`);
  } catch (error) {
    console.error("❌ Error respondiendo al paciente:", error);
  }
}

export async function POST(request) {
  try {
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${webhookSecret}`) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    console.log("📩 Webhook recibido body completo:", JSON.stringify(body, null, 2));

    const sessionId = body.sessionId;
    const payload = body.data || body;
    
    const fromChatId = payload.from || payload.chatId;
    const text = payload.body || payload.text || payload.message;
    
    console.log(`📱 fromChatId: "${fromChatId}"`);
    console.log(`💬 text: "${text}"`);
    
    if (!fromChatId || !text) {
      console.log("⚠️ Mensaje sin datos, ignorando");
      return Response.json({ ok: true, message: "Ignored" });
    }

    const intent = parseConfirmationIntent(text);
    if (!intent) {
      console.log("🤔 No se pudo determinar la intención");
      return Response.json({ ok: true, message: "No intent detected" });
    }
    console.log(`🎯 Intención: ${intent}`);

    await connectDB();

    // Buscar visita que tenga este patientChatId
    let visit = await Visit.findOne({
      patientChatId: fromChatId,
      confirmationStatus: "pending",
    }).sort({ followUpDate: -1 });

    // Si no encontramos, intentar resolver el número vía OpenWA
    if (!visit && sessionId && fromChatId) {
      console.log(`🔍 Intentando resolver contacto vía OpenWA...`);
      const contactInfo = await resolvePhoneFromChatId(sessionId, fromChatId);
      
      if (contactInfo) {
        const phone = String(contactInfo.number || contactInfo.id || "");
        const digits = phone.replace(/\D/g, "").slice(-10);
        console.log(`📞 Número resuelto: ${phone}, últimos 10: ${digits}`);
        
        visit = await Visit.findOne({
          patientPhone: { $regex: digits },
          confirmationStatus: "pending",
        }).sort({ followUpDate: -1 });
        
        // Si encontramos, guardamos el chatId para próxima vez
        if (visit) {
          visit.patientChatId = fromChatId;
          await visit.save();
          console.log(`✅ patientChatId guardado para ${visit.patientName}`);
        }
      }
    }

    // Último intento: buscar por paciente que tenga el número en el chatId
    if (!visit && fromChatId) {
      // Extraer dígitos del fromChatId (quitando @lid, @c.us, etc)
      const digits = fromChatId.replace(/@\w+/g, "").replace(/\D/g, "").slice(-10);
      if (digits.length >= 7) {
        visit = await Visit.findOne({
          patientPhone: { $regex: digits },
          confirmationStatus: "pending",
        }).sort({ followUpDate: -1 });
      }
    }

    if (!visit) {
      console.log(`⚠️ No se encontró visita pendiente`);
      return Response.json({ ok: true, message: "No pending visit found" });
    }

    console.log(`✅ Visita encontrada: ${visit.patientName} - ${visit.treatmentType}`);

    visit.confirmationStatus = intent;
    visit.patientResponse = text;
    visit.respondedAt = new Date();
    visit.patientChatId = fromChatId;
    await visit.save();

    console.log(`✅ Visita actualizada a ${intent}`);

    await respondToPatient(visit.patientPhone, intent, visit.language);
    await notifyOwnerOfResponse(visit, intent);

    return Response.json({ 
      ok: true, 
      message: `Visit updated to ${intent}`,
      patient: visit.patientName,
      status: intent
    });

  } catch (error) {
    console.error("❌ Error en webhook:", error);
    return Response.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get("challenge");
  
  if (challenge) {
    return new Response(challenge, { status: 200 });
  }
  
  return Response.json({ ok: true, message: "Webhook is active" });
}
