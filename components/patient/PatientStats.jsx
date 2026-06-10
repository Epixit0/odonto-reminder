"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CheckCircle2, XCircle, Clock } from "lucide-react";
import { t as tHelper } from "@/lib/i18n";

export default function PatientStats({ visits, dict }) {
  const total = visits.length;
  const confirmed = visits.filter((v) => v.confirmationStatus === "confirmed").length;
  const cancelled = visits.filter((v) => v.confirmationStatus === "cancelled").length;
  const pending = visits.filter((v) => !v.confirmationStatus || v.confirmationStatus === "pending").length;
  
  const confirmationRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;

  const items = [
    { value: total, label: "totalVisits", icon: Calendar, color: "aruba-turquoise" },
    { value: confirmed, label: "confirmed", icon: CheckCircle2, color: "confirmed" },
    { value: pending, label: "pending", icon: Clock, color: "pending" },
    { value: cancelled, label: "cancelled", icon: XCircle, color: "cancelled" },
  ];

  const colorMap = {
    "aruba-turquoise": { bg: "bg-[var(--aruba-turquoise)]/10", text: "text-[var(--aruba-turquoise)]" },
    confirmed: { bg: "bg-[var(--confirmed)]/10", text: "text-[var(--confirmed)]" },
    pending: { bg: "bg-[var(--pending)]/10", text: "text-[var(--pending)]" },
    cancelled: { bg: "bg-[var(--cancelled)]/10", text: "text-[var(--cancelled)]" },
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
      {items.map((item) => {
        const style = colorMap[item.color] || colorMap["aruba-turquoise"];
        const Icon = item.icon;
        return (
          <Card key={item.label} className="glass-card">
            <CardContent className="p-4 flex flex-col items-center text-center">
              <div className={`p-2 rounded-xl ${style.bg} mb-2`}>
                <Icon className={`w-5 h-5 ${style.text}`} />
              </div>
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">
                {dict ? tHelper(dict, item.label) : item.label}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
