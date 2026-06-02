"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Calendar, CheckCircle2, XCircle, Clock } from "lucide-react";

export default function PatientStats({ visits }) {
  const total = visits.length;
  const confirmed = visits.filter((v) => v.confirmationStatus === "confirmed").length;
  const cancelled = visits.filter((v) => v.confirmationStatus === "cancelled").length;
  const pending = visits.filter((v) => !v.confirmationStatus || v.confirmationStatus === "pending").length;
  
  const confirmationRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Card className="glass-card">
        <CardContent className="p-4 flex flex-col items-center text-center">
          <Calendar className="w-6 h-6 text-[var(--aruba-turquoise)] mb-2" />
          <p className="text-2xl font-bold">{total}</p>
          <p className="text-xs text-muted-foreground">Total Visitas</p>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardContent className="p-4 flex flex-col items-center text-center">
          <CheckCircle2 className="w-6 h-6 text-[var(--confirmed)] mb-2" />
          <p className="text-2xl font-bold">{confirmed}</p>
          <p className="text-xs text-muted-foreground">Confirmadas</p>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardContent className="p-4 flex flex-col items-center text-center">
          <Clock className="w-6 h-6 text-[var(--pending)] mb-2" />
          <p className="text-2xl font-bold">{pending}</p>
          <p className="text-xs text-muted-foreground">Pendientes</p>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardContent className="p-4 flex flex-col items-center text-center">
          <XCircle className="w-6 h-6 text-[var(--cancelled)] mb-2" />
          <p className="text-2xl font-bold">{cancelled}</p>
          <p className="text-xs text-muted-foreground">Canceladas</p>
        </CardContent>
      </Card>
    </div>
  );
}
