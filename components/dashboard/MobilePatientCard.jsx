"use client";

import { Card, CardContent } from "@/components/ui/card";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Button } from "@/components/ui/button";
import { Send, Phone, Calendar, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function MobilePatientCard({ visit, dateFormatter, t, lang }) {
  const [sending, setSending] = useState(false);

  async function sendTest() {
    setSending(true);
    try {
      const res = await fetch(`/api/patients/${visit._id}/send-test`, { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error || "Error");
      toast.success(t("sendSuccess", { name: visit.patientName }));
    } catch (error) {
      toast.error(error.message || t("errorSend"));
    } finally {
      setSending(false);
    }
  }

  return (
    <Card className="glass-card mb-3 overflow-hidden animate-fade-in">
      <CardContent className="p-4">
        {/* Header: nombre + badge */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[var(--aruba-turquoise)] truncate">
              {visit.patientName}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {lang === "en" ? "🇺🇸 English" : lang === "pap" ? "🇦🇼 Papiamento" : "🇪🇸 Español"}
            </div>
          </div>
          <StatusBadge status={visit.confirmationStatus || "pending"} t={t} />
        </div>

        {/* Detalles en grid */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{visit.patientPhone}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground col-span-2">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>{dateFormatter?.format ? dateFormatter.format(new Date(visit.followUpDate)) : new Date(visit.followUpDate).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={sendTest}
            disabled={sending}
            className="gap-1.5 text-xs flex-1"
          >
            {sending ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
            {t("sendTest")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
