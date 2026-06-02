import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getSession } from "@/lib/auth";
import Visit from "@/models/Visit";
import { sendWhatsAppMessage } from "@/lib/whatsapp";

export async function POST(request, { params }) {
  const session = await getSession();
  if (!session?.username) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  await connectDB();
  const visit = await Visit.findById(id);
  if (!visit) {
    return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 });
  }

  const testMessages = {
    es: `🧪 *Mensaje de prueba - Dent Q Clinic*\n\nHola ${visit.patientName}, este es un mensaje de prueba del sistema de recordatorios.\n\n✅ Si recibes esto, la configuración de WhatsApp funciona correctamente.`,
    en: `🧪 *Test Message - Dent Q Clinic*\n\nHi ${visit.patientName}, this is a test message from the reminder system.\n\n✅ If you received this, the WhatsApp configuration is working correctly.`,
    pap: `🧪 *Mensashi di prueba - Dent Q Clinic*\n\nBon dia ${visit.patientName}, esaki ta un mensashi di prueba di sistema di recordatorio.\n\n✅ Si bo a ricibi esaki, e configuracion di WhatsApp ta trahando.`,
  };

  const lang = testMessages[visit.language] ? visit.language : "es";
  const message = testMessages[lang];

  try {
    const result = await sendWhatsAppMessage(visit.patientPhone, message);
    const { normalizeChatId } = await import("@/lib/chatId");
    const chatId = normalizeChatId(result?.resolvedChatId);
    if (chatId) {
      await Visit.updateOne({ _id: visit._id }, { $set: { patientChatId: chatId } });
    }
    return NextResponse.json({ ok: true, message: "Mensaje de prueba enviado", patientChatId: chatId });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Error enviando mensaje" },
      { status: 500 }
    );
  }
}
