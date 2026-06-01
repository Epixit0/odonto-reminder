import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

// Obtener número desde OpenWA
async function resolvePhoneFromChatId(sessionId, chatId) {
  const baseUrl = process.env.OPENWA_API_URL;
  const apiKey = process.env.OPENWA_API_KEY;
  if (!baseUrl || !apiKey) return null;
  try {
    const res = await fetch(
      `${baseUrl}/api/sessions/${sessionId}/contacts/check/${chatId}`,
      { headers: { "X-API-Key": apiKey } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.number || data.id || null;
  } catch (err) {
    return null;
  }
}

function parseConfirmationIntent(text) {
  if (!text) return null;
  const normalized = text.toLowerCase().trim();
  
  const confirmWords = [
    "si", "sí", "yes", "ok", "okay", "confirmo", "confirmado", 
    "asistiré", "asistire", "voy", "perfecto", "bien", "dale", 
    "correcto", "claro", "por supuesto", "simon", "simón"
  ];
  
  const cancelWords = [
    "no", "cancelo", "cancelado", "no puedo", "no voy", "cancelar",
    "anular", "anulo", "imposible", "otro día", "otro dia", "reagendar"
  ];
  
  if (confirmWords.some(word => normalized.includes(word))) return "confirmed";
  if (cancelWords.some(word => normalized.includes(word))) return "cancelled";
  return null;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("es-ES", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

async function notifyOwnerOfResponse(visit, status) {
  const ownerPhone = process.env.OWNER_WHATSAPP_PHONE;
  if (!ownerPhone) return;
  const emoji = status === "confirmed" ? "✅" : "❌";
  const text = status === "confirmed" ? "CONFIRMADO" : "CANCELADO";
  const message = `📋 *Respuesta de Paciente*\n\n${visit.patientName} ha *${text}* su cita.\n📅 Fecha: ${formatDate(visit.followUpDate)}\n📱 Teléfono: ${visit.patientPhone}\n🦷 Tratamiento: ${visit.treatmentType}\n\n${emoji} ${text}`;
  try {
    await sendWhatsAppMessage(ownerPhone, message);
  } catch (error) {
    console.error("❌ Error notificando al odontólogo:", error);
  }
}

async function respondToPatient(phone, status, language = "es") {
  const messages = {
    es: {
      confirmed: "✅ *¡Gracias!*\n\nSu cita ha sido confirmada. Lo esperamos en la clínica.",
      cancelled: "❌ *Cita cancelada*\n\nSu cita ha sido cancelada. Para reagendar, contacte a la clínica."
    },
    en: {
      confirmed: "✅ *Thank you!*\n\nYour appointment has been confirmed.",
      cancelled: "❌ *Appointment cancelled*\n\nTo reschedule, please contact the clinic."
    },
    pap: {
      confirmed: "✅ *Danki!*\n\nSu cita a keda confirma.",
      cancelled: "❌ *Cita cancela*\n\nPa reagenda, contacta clinica."
    }
  };
  const lang = messages[language] ? language : "es";
  try {
    await sendWhatsAppMessage(phone, messages[lang][status]);
  } catch (error) {
    console.error("❌ Error respondiendo al paciente:", error);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const payload = body.data || body;
    
    // =============================================
    // FILTROS ESTRICTOS - Solo mensajes relevantes
    // =============================================
    
    // 1. Ignorar mensajes de grupos
    if (payload.isGroup === true) {
      return Response.json({ ok: true, message: "Ignored (group message)" });
    }
    
    // 2. Ignorar mensajes enviados por el consultorio
    if (payload.fromMe === true) {
      return Response.json({ ok: true, message: "Ignored (from me)" });
    }
    
    const fromChatId = payload.from || payload.chatId;
    const text = payload.body || payload.text || payload.message;
    const sessionId = body.sessionId;

    if (!fromChatId || !text) {
      return Response.json({ ok: true, message: "Ignored (no data)" });
    }

    console.log(`📩 Mensaje individual de: ${fromChatId} - Texto: "${text}"`);

    const intent = parseConfirmationIntent(text);
    if (!intent) {
      console.log(`🤔 No se pudo determinar intención (texto: "${text}")`);
      return Response.json({ ok: true, message: "No intent detected" });
    }
    console.log(`🎯 Intención: ${intent}`);

    await connectDB();

    // =============================================
    // BUSCAR PACIENTE POR CHAT ID GUARDADO
    // =============================================
    let visit = await Visit.findOne({
      patientChatId: fromChatId,
      confirmationStatus: "pending",
    });

    // Si no encuentra por chatId, buscar directamente por número
    // extrayendo los dígitos del fromChatId (que ya es el teléfono)
    if (!visit) {
      const digits = fromChatId.replace(/\D/g, "").slice(-10);
      if (digits) {
        visit = await Visit.findOne({
          patientPhone: { $regex: digits },
          confirmationStatus: "pending",
        }).sort({ createdAt: -1 });

        if (visit) {
          visit.patientChatId = fromChatId;
          await visit.save();
        }
      }
    }

    // Último recurso: intentar resolver el número vía OpenWA
    if (!visit && sessionId) {
      const phone = await resolvePhoneFromChatId(sessionId, fromChatId);
      if (phone) {
        const digits = String(phone).replace(/\D/g, "").slice(-10);
        visit = await Visit.findOne({
          patientPhone: { $regex: digits },
          confirmationStatus: "pending",
        }).sort({ createdAt: -1 });
        
        if (visit) {
          visit.patientChatId = fromChatId;
          await visit.save();
        }
      }
    }

    if (!visit) {
      console.log(`⚠️ No se encontró visita pendiente para ${fromChatId}`);
      return Response.json({ ok: true, message: "No pending visit found" });
    }

    console.log(`✅ Visita encontrada: ${visit.patientName}`);

    visit.confirmationStatus = intent;
    visit.patientResponse = text;
    visit.respondedAt = new Date();
    visit.patientChatId = fromChatId;
    await visit.save();

    await respondToPatient(visit.patientPhone, intent, visit.language);
    await notifyOwnerOfResponse(visit, intent);

    return Response.json({ ok: true, message: `Visit updated to ${intent}`, patient: visit.patientName });

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
