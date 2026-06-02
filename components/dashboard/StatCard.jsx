"use client";

import { Card, CardContent } from "@/components/ui/card";

export default function StatCard({ title, value, icon: Icon, color, subtitle }) {
  const colorMap = {
    "aruba-turquoise": { bg: "bg-[var(--aruba-turquoise)]/10", text: "text-[var(--aruba-turquoise)]" },
    confirmed: { bg: "bg-[var(--confirmed)]/10", text: "text-[var(--confirmed)]" },
    pending: { bg: "bg-[var(--pending)]/10", text: "text-[var(--pending)]" },
    cancelled: { bg: "bg-[var(--cancelled)]/10", text: "text-[var(--cancelled)]" },
  };
  const style = colorMap[color] || colorMap["aruba-turquoise"];

  return (
    <Card className="glass-card hover-lift overflow-hidden group">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold tabular-nums">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          <div className={`p-2.5 sm:p-3 rounded-xl ${style.bg} transition-transform group-hover:scale-110 duration-300`}>
            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${style.text}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
