import { connectDB } from "@/lib/db";
import Visit from "@/models/Visit";
import Patient from "@/models/Patient";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

// Obtener número desde OpenWA
// Soporta tanto @c.us como @lid (ID interno de privacidad de WhatsApp)
async function resolvePhoneFromChatId(sessionId, chatId) {
  const baseUrl = process.env.OPENWA_API_URL;
  const apiKey = process.env.OPENWA_API_KEY;
  if (!baseUrl || !apiKey || !sessionId) return null;
  try {
    // Si es @lid, obtener datos del contacto
    if (chatId.endsWith("@lid")) {
      const encoded = encodeURIComponent(chatId);
      const res = await fetch(
        `${baseUrl}/api/sessions/${sessionId}/contacts/${encoded}`,
        { headers: { "X-API-Key": apiKey } }
      );
      if (!res.ok) return null;
      const data = await res.json();
      const number = data?.number || null;
      const pushName = data?.pushName || data?.name || null;
      // Devolvemos tanto número como nombre para búsqueda
      return { number, pushName };
    }

    // Para @c.us normal, usar check que verifica si el número existe
    const res = await fetch(
      `${baseUrl}/api/sessions/${sessionId}/contacts/check/${chatId}`,
      { headers: { "X-API-Key": apiKey } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return { number: data.number || data.id || null };
  } catch (err) {
    return null;
  }
}

function parseConfirmationIntent(text) {
  if (!text) return null;
  const normalized = text.toLowerCase().trim();
  const words = normalized.split(/\s+/);
  
  // Matchear palabras completas (no substrings)
  const isExactWord = (word, target) => {
    if (word === target) return true;
    // También matchear si la palabra está como token independiente
    return false;
  };
  
  // Frases completas tienen prioridad
  const confirmPhrases = ["por supuesto"];
  const cancelPhrases = ["no puedo", "no voy", "otro día", "otro dia"];
  
  if (confirmPhrases.some(phrase => normalized.includes(phrase))) return "confirmed";
  if (cancelPhrases.some(phrase => normalized.includes(phrase))) return "cancelled";
  
  // Palabras individuales
  const confirmWords = new Set([
    "si", "sí", "yes", "ok", "okay", "confirmo", "confirmado",
    "asistiré", "asistire", "voy", "perfecto", "bien", "dale",
    "correcto", "claro", "simon", "simón",
  ]);
  
  const cancelWords = new Set([
    "no", "cancelo", "cancelado", "cancelar",
    "anular", "anulo", "imposible", "reagendar",
  ]);
  
  for (const word of words) {
    if (confirmWords.has(word)) return "confirmed";
    if (cancelWords.has(word)) return "cancelled";
  }
  
  return null;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("es-ES", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
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
    await sendWhatsAppMessage(phone, messages[lang][status], sessionId);
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
    // sessionId puede venir en distintos lugares según la versión de OpenWA
    const sessionId = body.sessionId || payload.sessionId || process.env.OPENWA_SESSION_ID;

    if (!fromChatId || !text) {
      return Response.json({ ok: true, message: "Ignored (no data)" });
    }

    console.log(`📩 Mensaje individual de: ${fromChatId} - Texto: "${text}"`);

    const intent = parseConfirmationIntent(text);
    if (!intent) {
      console.log(`🤔 No se pudo determinar intención (texto: "${text}")`);
      // Auto-respuesta: el paciente no entendió el mensaje
      await connectDB();
      const pendingVisit = await Visit.findOne({
        patientChatId: fromChatId,
        confirmationStatus: "pending",
      });
      if (pendingVisit) {
        const lang = pendingVisit.language || "es";
        const autoMessages = {
          es: "🤖 *Esto es un mensaje automático*\n\nSolo reconozco respuestas como *SI* o *NO* para confirmar o cancelar su cita. Si necesita ayuda, por favor contacte a la clínica directamente por teléfono.\n\nGracias 🙏",
          en: "🤖 *This is an automated message*\n\nI only recognize replies like *YES* or *NO* to confirm or cancel your appointment. If you need help, please contact the clinic directly.\n\nThank you 🙏",
          pap: "🤖 *Es un mensahe automático*\n\nMi ta reconoce solamente respuesta como *SI* of *NO* pa confirmá of cancela bo cita. Si bo ke ayuda, por fabor contacta e clinica direktamente.\n\nDanki 🙏",
        };
        await sendWhatsAppMessage(pendingVisit.patientPhone, autoMessages[lang] || autoMessages.es, sessionId);
      }
      return Response.json({ ok: true, message: "No intent detected" });
    }
    console.log(`🎯 Intención: ${intent}`);

    await connectDB();

    console.log(`🔍 sessionId presente: ${Boolean(sessionId)}`);
    console.log(`🔍 fromChatId: "${fromChatId}"`);

    // =============================================
    // BUSCAR PACIENTE POR CHAT ID GUARDADO
    // =============================================
    let visit = await Visit.findOne({
      patientChatId: fromChatId,
      confirmationStatus: "pending",
    });

    // Si no encuentra por chatId, buscar directamente por número
    // extrayendo los dígitos del fromChatId
    if (!visit) {
      const digits = fromChatId.replace(/\D/g, "").slice(-10);
      console.log(`🔍 Dígitos extraídos de fromChatId: "${digits}"`);
      if (digits) {
        visit = await Visit.findOne({
          patientPhone: { $regex: digits },
          confirmationStatus: "pending",
        }).sort({ createdAt: -1 });

        if (visit) {
          console.log(`✅ Encontrado por dígitos directos: ${visit.patientName}`);
          visit.patientChatId = fromChatId;
          await visit.save();
        } else {
          console.log(`❌ No se encontró visita con dígitos: "${digits}"`);
        }
      }
    }

    // Intentar resolver el número vía OpenWA
    if (!visit && sessionId) {
      console.log(`🔍 Resolviendo contacto vía OpenWA...`);
      const contactInfo = await resolvePhoneFromChatId(sessionId, fromChatId);

      // Intentar por número de teléfono
      if (contactInfo?.number) {
        const digits = String(contactInfo.number).replace(/\D/g, "").slice(-10);
        console.log(`🔍 Dígitos desde OpenWA: "${digits}"`);
        visit = await Visit.findOne({
          patientPhone: { $regex: digits },
          confirmationStatus: "pending",
        }).sort({ createdAt: -1 });

        if (visit) {
          console.log(`✅ Visita encontrada vía OpenWA (número): ${visit.patientName}`);
          visit.patientChatId = fromChatId;
          await visit.save();
        }
      }
    }

    // ÚLTIMO RECURSO: buscar entre todas las visitas pendientes
    // por coincidencia parcial del número de teléfono
    if (!visit) {
      const allPending = await Visit.find({
        confirmationStatus: "pending",
      }).sort({ createdAt: -1 }).limit(20).lean();

      console.log(`🔍 Fallback: revisando ${allPending.length} visitas pendientes...`);
      for (const v of allPending) {
        const phoneDigits = v.patientPhone.replace(/\D/g, "");
        const chatIdDigits = fromChatId.replace(/\D/g, "");
        // Coincidencia parcial: los últimos 8+ dígitos coinciden
        if (phoneDigits.length >= 8 && chatIdDigits.length >= 8) {
          const phoneTail = phoneDigits.slice(-8);
          const chatTail = chatIdDigits.slice(-8);
          if (phoneTail === chatTail) {
            visit = v;
            console.log(`✅ Fallback: encontrado ${v.patientName} por dígitos finales`);
            // Guardar el patientChatId actualizado
            await Visit.updateOne(
              { _id: v._id },
              { $set: { patientChatId: fromChatId } }
            );
            break;
          }
        }
      }
      if (!visit) {
        console.log(`❌ Fallback: ninguna visita pendiente coincide`);
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

    // Actualizar lastActivity del Patient si existe
    if (visit.patientId) {
      await Patient.findByIdAndUpdate(visit.patientId, {
        lastActivity: new Date(),
      });
    }

    await respondToPatient(visit.patientPhone, intent, visit.language, sessionId);
    await notifyOwnerOfResponse(visit, intent, sessionId);

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
