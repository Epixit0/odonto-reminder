import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

// Parser de intenciones del paciente
function parseConfirmationIntent(text) {
  if (!text) return null;
  
  const normalized = text.toLowerCase().trim();
  
  // Palabras de confirmación
  const confirmWords = [
    "si", "sí", "yes", "ok", "okay", "confirmo", "confirmado", 
    "asistiré", "asistire", "voy", "perfecto", "bien", "dale", 
    "correcto", "claro", "por supuesto"
  ];
  
  // Palabras de cancelación
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

// Formatear fecha para mensajes
function formatDate(date) {
  return new Date(date).toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Notificar al odontólogo de la respuesta del paciente
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

// Responder al paciente confirmando su respuesta
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
    // Verificar API key del webhook si está configurada
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = request.headers.get("authorization");
      if (authHeader !== `Bearer ${webhookSecret}`) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await request.json();
    console.log("📩 Webhook recibido:", JSON.stringify(body, null, 2));

    // Extraer datos del mensaje (formato OpenWA)
    const from = body.from || body.chatId || body.sender;
    const text = body.text || body.message || body.body;
    
    if (!from || !text) {
      console.log("⚠️ Mensaje sin 'from' o 'text', ignorando");
      return Response.json({ ok: true, message: "Ignored" });
    }

    // Limpiar número de teléfono (quitar @c.us si existe)
    const phoneNumber = from.replace(/@c\.us$/, "").replace(/\D/g, "");
    console.log(`📱 Mensaje de: ${phoneNumber}`);
    console.log(`💬 Texto: ${text}`);

    // Parsear intención
    const intent = parseConfirmationIntent(text);
    if (!intent) {
      console.log("🤔 No se pudo determinar la intención del mensaje");
      return Response.json({ ok: true, message: "No intent detected" });
    }

    console.log(`🎯 Intención detectada: ${intent}`);

    // Conectar a BD
    await connectDB();

    // Buscar la visita más reciente del paciente que esté pendiente
    const visit = await Visit.findOne({
      patientPhone: { $regex: phoneNumber.slice(-10) }, // Buscar por últimos 10 dígitos
      confirmationStatus: "pending",
      followUpDate: { $gte: new Date() }, // Citas futuras
    }).sort({ followUpDate: 1 });

    if (!visit) {
      console.log(`⚠️ No se encontró visita pendiente para ${phoneNumber}`);
      return Response.json({ ok: true, message: "No pending visit found" });
    }

    console.log(`✅ Visita encontrada: ${visit.patientName} - ${visit.treatmentType}`);

    // Actualizar visita
    visit.confirmationStatus = intent;
    visit.patientResponse = text;
    visit.respondedAt = new Date();
    await visit.save();

    console.log(`✅ Visita actualizada: ${intent}`);

    // Responder al paciente
    await respondToPatient(visit.patientPhone, intent, visit.language);

    // Notificar al odontólogo
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

// Para verificar el webhook (OpenWA usualmente requiere esto)
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get("challenge");
  
  if (challenge) {
    return new Response(challenge, { status: 200 });
  }
  
  return Response.json({ ok: true, message: "Webhook is active" });
}
