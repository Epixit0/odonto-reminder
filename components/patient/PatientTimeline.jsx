"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Calendar, Clock, FileText } from "lucide-react";

export default function PatientTimeline({ visits, dateFormatter, t }) {
  if (visits.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center text-muted-foreground">
          No hay visitas registradas para este paciente.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {visits.map((visit, index) => (
        <Card key={visit._id} className="glass-card hover-lift">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg">{visit.treatmentType}</h3>
                  <StatusBadge status={visit.confirmationStatus || "pending"} t={t} />
                </div>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Tratado: {dateFormatter.format(new Date(visit.treatmentDate))}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Próximo: {dateFormatter.format(new Date(visit.followUpDate))}
                  </div>
                  {visit.notes && (
                    <div className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {visit.notes}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right text-sm text-muted-foreground">
                <p>{dateFormatter.format(new Date(visit.createdAt))}</p>
                {visit.cost && (
                  <p className="font-medium text-foreground">
                    ${visit.cost} {visit.paid ? "(Pagado)" : "(Pendiente)"}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
