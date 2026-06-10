"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { t as tHelper } from "@/lib/i18n";

export default function PatientRow({ visit, dateFormatter, dict, onPatientClick, onUpdate }) {
  const [sending, setSending] = useState(false);
  const [simulating, setSimulating] = useState(false);

  async function sendTest() {
    setSending(true);
    try {
      const res = await fetch(`/api/patients/${visit._id}/send-test`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || tHelper(dict, "errorSend"));
      }
      toast.success(tHelper(dict, "sendSuccess", { name: visit.patientName }));
    } catch (error) {
      toast.error(error.message || tHelper(dict, "errorSend"));
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
        toast.success(
          tHelper(dict, status === "confirmed" ? "simulateConfirmSuccess" : "simulateCancelSuccess", {
            name: visit.patientName,
          }),
        );
        onUpdate?.();
      } else {
        throw new Error(data.message || tHelper(dict, "errorSimulate"));
      }
    } catch (error) {
      toast.error(error.message || tHelper(dict, "errorSimulate"));
    } finally {
      setSimulating(false);
    }
  }

  const remindersSent = [];
  if (visit.sent5dPatient) remindersSent.push("1°✅");
  if (visit.sent2dPatient) remindersSent.push("2°✅");

  const status = visit.confirmationStatus || "pending";
  const isPending = status === "pending";

  return (
    <tr className="hover:bg-muted/30 transition-all duration-200 cursor-pointer">
      <td className="px-3 sm:px-4 py-3 sm:py-3.5">
        <button
          onClick={() => onPatientClick?.(visit.patientId?._id || visit.patientId)}
          className="font-medium text-[var(--aruba-turquoise)] hover:text-[var(--aruba-turquoise-dark)] transition-colors text-sm sm:text-base text-left"
        >
          {visit.patientName}
        </button>
        <div className="text-xs text-muted-foreground mt-0.5">
          {visit.language === "en" ? "🇺🇸 EN" : visit.language === "pap" ? "🇦🇼 PAP" : "🇪🇸 ES"}
        </div>
      </td>
      <td className="px-3 sm:px-4 py-3 sm:py-3.5 hidden sm:table-cell">
        <div className="text-sm">{visit.patientPhone}</div>
      </td>
      <td className="px-3 sm:px-4 py-3 sm:py-3.5 hidden md:table-cell">
        <div className="text-sm truncate max-w-[120px]">{visit.treatmentType}</div>
      </td>
      <td className="px-3 sm:px-4 py-3 sm:py-3.5">
        <div className="text-xs sm:text-sm font-medium">
          {dateFormatter?.format ? dateFormatter.format(new Date(visit.followUpDate)) : new Date(visit.followUpDate).toLocaleDateString()}
        </div>
        {visit.notifyUnit === "minutes" && (
          <div className="text-xs text-muted-foreground mt-0.5">Prueba</div>
        )}
      </td>
      <td className="px-3 sm:px-4 py-3 sm:py-3.5">
        <StatusBadge status={status} dict={dict} />
      </td>
      <td className="px-3 sm:px-4 py-3 sm:py-3.5">
        {remindersSent.length > 0 ? (
          <span className="text-xs text-emerald-600 font-medium">
            {remindersSent.join(" ")}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">&mdash;</span>
        )}
      </td>
      <td className="px-3 sm:px-4 py-3 sm:py-3.5">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={sendTest}
            disabled={sending}
            className="gap-1 text-xs h-8 px-1.5 sm:px-2"
            title={tHelper(dict, "sendTest")}
          >
            {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
          </Button>
          {isPending && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => simulateResponse("confirmed")}
                disabled={simulating}
                className="gap-1 text-xs h-8 px-1 text-emerald-600 hover:text-emerald-700"
                title={tHelper(dict, "simulateConfirm")}
              >
                ✅
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => simulateResponse("cancelled")}
                disabled={simulating}
                className="gap-1 text-xs h-8 px-1 text-rose-600 hover:text-rose-700"
                title={tHelper(dict, "simulateCancel")}
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
