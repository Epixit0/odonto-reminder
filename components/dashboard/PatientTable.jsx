"use client";

import { Calendar, Phone, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import PatientRow from "@/components/PatientRow";
import MobilePatientCard from "@/components/dashboard/MobilePatientCard";
import { t as tHelper } from "@/lib/i18n";

export default function PatientTable({ visits, loading, searchQuery, filterStatus, onClearFilters, dict, dateFormatter, onPatientClick }) {
  if (loading) {
    return (
      <Card className="glass-card overflow-hidden">
        <div className="p-4 space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-4 w-1/5" />
              <Skeleton className="h-4 w-1/6" />
            </div>
          ))}
        </div>
      </Card>
    );
  }

  if (visits.length === 0) {
    return (
      <Card className="glass-card overflow-hidden">
        <div className="px-4 py-12 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="p-4 rounded-full bg-muted">
              <AlertCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              {searchQuery || filterStatus !== "all"
                ? (dict ? tHelper(dict, "noPatientsFilter") : "No se encontraron pacientes")
                : (dict ? tHelper(dict, "noPatients") : "No hay pacientes registrados")}
            </p>
            {(searchQuery || filterStatus !== "all") && (
              <Button variant="outline" size="sm" onClick={onClearFilters}>
                {dict ? tHelper(dict, "clearFilters") : "Limpiar filtros"}
              </Button>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      {/* Vista Cards (mobile) */}
      <div className="sm:hidden space-y-1">
        {visits.map((v) => (
          <MobilePatientCard
            key={v._id}
            visit={v}
            dateFormatter={dateFormatter}
            t={(key, vars) => tHelper(dict, key, vars)}
          />
        ))}
      </div>

      {/* Vista Tabla (desktop) */}
      <Card className="glass-card overflow-hidden hidden sm:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {dict ? tHelper(dict, "patientName") : "Paciente"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">
                  <div className="flex items-center gap-1">
                    <Phone className="w-3 h-3" />
                    {dict ? tHelper(dict, "contact") : "Contacto"}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {dict ? tHelper(dict, "nextVisit") : "Próximo control"}
                  </div>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {dict ? tHelper(dict, "status") : "Estado"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {dict ? tHelper(dict, "reminder") : "Recordatorio"}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {dict ? tHelper(dict, "actions") : "Acciones"}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visits.map((v) => (
                <PatientRow
                  key={v._id}
                  visit={v}
                  dateFormatter={dateFormatter}
                  dict={dict}
                  onPatientClick={onPatientClick}
                />
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
