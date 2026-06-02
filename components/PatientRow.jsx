"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/dashboard/StatusBadge";
import Link from "next/link";

export default function PatientRow({ visit, dateFormatter, t }) {
  const [sending, setSending] = useState(false);
  const [simulating, setSimulating] = useState(false);

  async function sendTest() {
    setSending(true);
    try {
      const res = await fetch(`/api/patients/${visit._id}/send-test`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error enviando");
      }
      toast.success(`Mensaje de prueba enviado a ${visit.patientName}`);
    } catch (error) {
      toast.error(error.message || "Error al enviar mensaje de prueba");
    } finally {
      setSending(false);
    }
  }

  async function simulateResponse(status) {
    setSimulating(true);
    try {
      const res = await fetch(`/api/webhooks/whatsapp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: visit.patientChatId || `${visit.patientPhone.replace(/\D/g, "")}@c.us`,
          body: status === "confirmed" ? "SI" : "NO",
        }),
      });
      const data = await res.json();
      if (data.ok && data.message?.includes("updated")) {
        toast.success(`${visit.patientName} ha ${status === "confirmed" ? "confirmado" : "cancelado"} la cita`);
        setTimeout(() => window.location.reload(), 1000);
      } else {
        throw new Error(data.message || "Error");
      }
    } catch (error) {
      toast.error(error.message || "Error al simular respuesta");
    } finally {
      setSimulating(false);
    }
  }

  const remindersSent = [];
  if (visit.sent5dPatient) remindersSent.push("1°✅");

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <Link 
          href={`/patients/${visit.patientId?._id || visit.patientId || visit._id}`} 
          className="font-medium text-[var(--aruba-turquoise)] hover:text-[var(--aruba-turquoise-dark)] transition-colors"
        >
          {visit.patientName}
        </Link>
        <div className="text-xs text-muted-foreground mt-0.5">
          {visit.language === "es"
            ? "🇪🇸 Español"
            : visit.language === "en"
              ? "🇺🇸 English"
              : "🇦🇼 Papiamento"}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm">{visit.patientPhone}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm">{visit.treatmentType}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-medium">
          {dateFormatter.format(new Date(visit.followUpDate))}
        </div>
        <div className="text-xs text-muted-foreground">
          Tratado: {dateFormatter.format(new Date(visit.treatmentDate))}
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={visit.confirmationStatus || "pending"} t={t} />
      </td>
      <td className="px-4 py-3">
        {remindersSent.length > 0 ? (
          <span className="text-xs text-emerald-600 font-medium">
            {remindersSent.join(" ")}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={sendTest}
            disabled={sending}
            className="gap-1 text-xs h-8 px-2"
            title="Enviar mensaje de prueba"
          >
            {sending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
          </Button>
          {(visit.confirmationStatus === "pending" || !visit.confirmationStatus) && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => simulateResponse("confirmed")}
                disabled={simulating}
                className="gap-1 text-xs h-8 px-2 text-emerald-600 hover:text-emerald-700"
                title="Simular confirmación"
              >
                ✅
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => simulateResponse("cancelled")}
                disabled={simulating}
                className="gap-1 text-xs h-8 px-2 text-rose-600 hover:text-rose-700"
                title="Simular cancelación"
              >
                ❌
              </Button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
