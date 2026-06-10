"use client";

import { Card, CardContent } from "@/components/ui/card";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { Calendar, Clock, FileText } from "lucide-react";
import { t as tHelper } from "@/lib/i18n";

export default function PatientTimeline({ visits, dateFormatter, dict }) {
  if (visits.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center text-muted-foreground">
          {dict ? tHelper(dict, "noVisits") : "No hay visitas registradas"}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {visits.map((visit) => (
        <Card key={visit._id} className="glass-card hover-lift">
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="font-semibold text-sm sm:text-lg truncate">{visit.treatmentType}</h3>
                  <StatusBadge status={visit.confirmationStatus || "pending"} dict={dict} />
                </div>
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{dateFormatter.format(new Date(visit.treatmentDate))}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{dateFormatter.format(new Date(visit.followUpDate))}</span>
                  </div>
                  {visit.notes && (
                    <div className="flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{visit.notes}</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs sm:text-sm text-muted-foreground sm:text-right">
                {visit.cost && (
                  <p className="font-medium text-foreground">
                    ${visit.cost} {visit.paid ? "✓" : "○"}
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
