"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, ChevronDown, Clock, User, Shield } from "lucide-react";

const ACTION_LABELS = {
  create: { label: "Creación", color: "bg-emerald-500/10 text-emerald-600" },
  update: { label: "Actualización", color: "bg-blue-500/10 text-blue-600" },
  confirm: { label: "Confirmación", color: "bg-emerald-500/10 text-emerald-600" },
  cancel: { label: "Cancelación", color: "bg-rose-500/10 text-rose-600" },
  login: { label: "Login", color: "bg-violet-500/10 text-violet-600" },
  login_failed: { label: "Login fallido", color: "bg-rose-500/10 text-rose-600" },
  send_test: { label: "Test enviado", color: "bg-amber-500/10 text-amber-600" },
  send_reminder: { label: "Recordatorio", color: "bg-cyan-500/10 text-cyan-600" },
  export_csv: { label: "Exportación", color: "bg-slate-500/10 text-slate-600" },
};

export default function AuditLogViewer() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("all");
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchLogs = useCallback(async (append = false) => {
    if (append) setLoadingMore(true); else setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "30" });
      if (append && cursor) params.set("cursor", cursor);
      if (actionFilter !== "all") params.set("action", actionFilter);

      const res = await fetch(`/api/admin/audit?${params}`);
      const data = await res.json();
      setLogs(append ? (prev) => [...prev, ...(data.items || [])] : (data.items || []));
      setCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch {}
    finally { setLoading(false); setLoadingMore(false); }
  }, [actionFilter, cursor]);

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  function formatTime(date) {
    return new Date(date).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-[var(--aruba-turquoise)]" />
            Registro de Auditoría
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Filtrar acción" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(ACTION_LABELS).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={() => fetchLogs()} className="h-8">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="p-3 flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No hay registros de auditoría
            </div>
          ) : (
            logs.map((entry) => {
              const actionInfo = ACTION_LABELS[entry.action] || { label: entry.action, color: "bg-slate-500/10 text-slate-600" };
              return (
                <div key={entry._id} className="p-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full ${actionInfo.color} flex items-center justify-center shrink-0`}>
                      <Shield className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] font-medium ${actionInfo.color}`}>
                          {actionInfo.label}
                        </Badge>
                        <span className="text-xs font-medium">{entry.resource}</span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          {formatTime(entry.createdAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        {entry.username || "system"}
                        <Clock className="w-3 h-3 ml-2" />
                        {formatTime(entry.createdAt)}
                      </div>
                      {entry.details?.patientName && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {entry.details.patientName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {hasMore && (
          <div className="p-3 border-t border-border text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => fetchLogs(true)}
              disabled={loadingMore}
              className="gap-1 text-xs"
            >
              {loadingMore ? "Cargando..." : "Cargar más"}
              <ChevronDown className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
