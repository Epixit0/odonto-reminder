"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

function StatusBadge({ status, t }) {
  const configs = {
    confirmed: {
      icon: CheckCircle2,
      className: "badge-confirmed",
      label: t?.confirmed || "Confirmado",
    },
    pending: {
      icon: Clock,
      className: "badge-pending",
      label: t?.pending || "Pendiente",
    },
    cancelled: {
      icon: XCircle,
      className: "badge-cancelled",
      label: t?.cancelled || "Cancelado",
    },
  };

  const config = configs[status] || configs.pending;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} gap-1.5 font-medium`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </Badge>
  );
}

function SendIndicator({ sent, label }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        sent ? "text-emerald-600" : "text-gray-300"
      }`}
      title={sent ? `Recordatorio ${label} enviado` : `Recordatorio ${label} no enviado`}
    >
      <CheckCircle2 className={`w-3.5 h-3.5 ${sent ? "fill-emerald-500 text-white" : ""}`} />
      {label}
    </span>
  );
}

export default function PatientRow({ visit, dateFormatter, t, onUpdate }) {
  const [sending, setSending] = useState(false);

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

  return (
    <tr className="hover:bg-muted/30 transition-colors">
      <td className="px-4 py-3">
        <div className="font-medium">{visit.patientName}</div>
        <div className="text-xs text-muted-foreground">
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
        <div className="flex items-center gap-2">
          <SendIndicator sent={visit.sent5dPatient} label="5d" />
          <SendIndicator sent={visit.sent2dPatient} label="2d" />
        </div>
      </td>
      <td className="px-4 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={sendTest}
          disabled={sending}
          className="gap-1.5 text-xs"
        >
          {sending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          {sending ? "Enviando..." : "Probar"}
        </Button>
      </td>
    </tr>
  );
}
