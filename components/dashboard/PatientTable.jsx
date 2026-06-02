"use client";

import { Calendar, Phone, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PatientRow from "@/components/PatientRow";

export default function PatientTable({ visits, loading, searchQuery, filterStatus, onClearFilters, t, dateFormatter, countdown }) {
  return (
    <Card className="glass-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t?.patientName || "Paciente"}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Contacto
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t?.treatment || "Tratamiento"}
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {t?.nextVisit || "Próximo control"}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Estado
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Recordatorio
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                  <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                </tr>
              ))
            ) : visits.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-4 rounded-full bg-muted">
                      <AlertCircle className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">
                      {searchQuery || filterStatus !== "all"
                        ? "No se encontraron pacientes con estos filtros"
                        : "No hay pacientes registrados"}
                    </p>
                    {(searchQuery || filterStatus !== "all") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onClearFilters}
                      >
                        Limpiar filtros
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              visits.map((v) => {
                const visitCountdown = countdown && countdown.id === v._id ? countdown : null;
                return (
                  <PatientRow
                    key={v._id}
                    visit={v}
                    dateFormatter={dateFormatter}
                    t={t}
                    countdown={visitCountdown}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
