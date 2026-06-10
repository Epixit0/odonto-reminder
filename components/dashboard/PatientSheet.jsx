"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, DollarSign, FileText, ExternalLink } from "lucide-react";
import Link from "next/link";
import { t as tHelper } from "@/lib/i18n";

export default function PatientSheet({ patientId, open, onOpenChange, dict }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("appointments");

  useEffect(() => {
    if (!open || !patientId) return;
    setLoading(true);
    setData(null);
    fetch(`/api/patients/${patientId}/detail`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found");
        return r.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        setData(null);
        setLoading(false);
      });
  }, [open, patientId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle className="text-gradient-hero">
            {dict ? tHelper(dict, "patientProfile") : "Perfil del Paciente"}
          </SheetTitle>
          <SheetDescription>
            {dict ? tHelper(dict, "visitHistory") : "Historial clínico completo"}
          </SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-14 h-14 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-28" />
              </div>
            </div>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : data ? (
          <>
            {/* Hero del paciente */}
            <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-gradient-to-br from-[var(--aruba-turquoise)]/5 to-transparent border border-border">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[var(--aruba-turquoise)] to-[var(--aruba-turquoise-light)] flex items-center justify-center text-white text-xl font-bold shrink-0 shadow-md">
                {data.patient?.name?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-lg truncate">{data.patient?.name}</h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />
                  <span className="truncate">{data.patient?.phone}</span>
                </div>
                {data.patient?.tags?.length > 0 && (
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {data.patient.tags.map((tag, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px]">{tag}</Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full grid grid-cols-3 mb-4">
                <TabsTrigger value="appointments" className="text-xs gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  {dict ? tHelper(dict, "sheetAppointments") : "Citas"}
                </TabsTrigger>
                <TabsTrigger value="notes" className="text-xs gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  {dict ? tHelper(dict, "sheetNotes") : "Notas"}
                </TabsTrigger>
                <TabsTrigger value="account" className="text-xs gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" />
                  {dict ? tHelper(dict, "sheetAccount") : "Cuenta"}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="appointments" className="space-y-3">
                {data.visits?.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {dict ? tHelper(dict, "noVisits") : "Sin visitas registradas"}
                  </p>
                ) : (
                  data.visits?.slice(0, 10).map((visit) => (
                    <div key={visit._id} className="p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{visit.treatmentType}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            visit.confirmationStatus === "confirmed"
                              ? "badge-confirmed"
                              : visit.confirmationStatus === "cancelled"
                                ? "badge-cancelled"
                                : "badge-pending"
                          }`}
                        >
                          {visit.confirmationStatus === "confirmed"
                            ? "✓"
                            : visit.confirmationStatus === "cancelled"
                              ? "✗"
                              : "○"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {new Date(visit.treatmentDate).toLocaleDateString()}
                        <Clock className="w-3 h-3 ml-2" />
                        {new Date(visit.followUpDate).toLocaleDateString()}
                      </div>
                      {visit.cost && (
                        <div className="text-xs text-muted-foreground mt-1">
                          ${visit.cost} {visit.paid ? "✓" : "○"}
                        </div>
                      )}
                    </div>
                  ))
                )}
                <Link href={`/patients/${patientId}`}>
                  <Button variant="outline" size="sm" className="w-full gap-2 text-xs mt-2">
                    <ExternalLink className="w-3.5 h-3.5" />
                    {dict ? tHelper(dict, "viewFullProfile") : "Ver perfil completo"}
                  </Button>
                </Link>
              </TabsContent>

              <TabsContent value="notes">
                <div className="p-4 rounded-lg border border-border">
                  <p className="text-sm font-medium mb-2">
                    {dict ? tHelper(dict, "sheetNotes") : "Notas clínicas"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {data.patient?.notes || "Sin notas registradas."}
                  </p>
                  <textarea
                    className="w-full mt-3 p-3 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--aruba-turquoise)]/30"
                    rows={4}
                    placeholder={dict ? "Agregar nota clínica..." : "Add clinical note..."}
                    defaultValue={data.patient?.notes || ""}
                  />
                </div>
              </TabsContent>

              <TabsContent value="account">
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-[var(--aruba-turquoise)]/5 border border-border text-center">
                      <p className="text-lg font-bold text-[var(--aruba-turquoise)]">
                        ${data.accountSummary?.totalCharged || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dict ? tHelper(dict, "sheetTotalCharged") : "Cobrado"}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-green-500/5 border border-border text-center">
                      <p className="text-lg font-bold text-green-600">
                        ${data.accountSummary?.totalPaid || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dict ? tHelper(dict, "sheetTotalPaid") : "Pagado"}
                      </p>
                    </div>
                    <div className="p-3 rounded-lg bg-amber-500/5 border border-border text-center">
                      <p className="text-lg font-bold text-amber-600">
                        ${data.accountSummary?.pending || 0}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {dict ? tHelper(dict, "sheetPending") : "Pendiente"}
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--aruba-turquoise)] to-green-500 rounded-full transition-all duration-500"
                      style={{
                        width: data.accountSummary?.totalCharged > 0
                          ? `${Math.round((data.accountSummary.totalPaid / data.accountSummary.totalCharged) * 100)}%`
                          : "0%",
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    {data.accountSummary?.totalCharged > 0
                      ? `${Math.round((data.accountSummary.totalPaid / data.accountSummary.totalCharged) * 100)}% pagado`
                      : "Sin movimientos"}
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {/* Link a perfil completo */}
            <div className="mt-6 pt-4 border-t border-border">
              <Link href={`/patients/${patientId}`}>
                <Button variant="outline" size="sm" className="w-full gap-2 text-xs">
                  <ExternalLink className="w-3.5 h-3.5" />
                  {dict ? tHelper(dict, "viewFullProfile") : "Ver perfil completo"}
                </Button>
              </Link>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">
            Error al cargar datos del paciente.
          </p>
        )}
      </SheetContent>
    </Sheet>
  );
}
