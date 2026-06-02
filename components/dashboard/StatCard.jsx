"use client";

import { Card, CardContent } from "@/components/ui/card";

export default function StatCard({ title, value, icon: Icon, color, subtitle }) {
  return (
    <Card className="glass-card hover-lift overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-${color}/10`}>
            <Icon className={`w-5 h-5 text-${color}`} style={{ color: `var(--${color})` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
