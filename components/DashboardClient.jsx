"use client";

import { useMemo, useState, useEffect } from "react";
import { getDictionary } from "@/lib/i18n";
import { Stethoscope, LogOut, Globe, Users, CheckCircle2, XCircle, Clock, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toaster, toast } from "sonner";
import StatCard from "@/components/dashboard/StatCard";
import PatientForm from "@/components/dashboard/PatientForm";
import PatientFilters from "@/components/dashboard/PatientFilters";
import PatientTable from "@/components/dashboard/PatientTable";
import ThemeToggle from "@/components/ThemeToggle";
import { exportVisitsToCSV } from "@/lib/export";
import { useKeyboard } from "@/hooks/useKeyboard";

export default function DashboardClient({ username, initialVisits = [] }) {
  const [lang, setLang] = useState("es");
  const t = useMemo(() => getDictionary(lang), [lang]);
  
  const dateFormatter = useMemo(() => {
    const locale = lang === "en" ? "en-US" : lang === "pap" ? "es-ES" : "es-ES";
    return new Intl.DateTimeFormat(locale, {
      timeZone: "UTC",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }, [lang]);

  const [visits, setVisits] = useState(initialVisits);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [countdown, setCountdown] = useState(null);

  // Polling para recordatorios por minuto y recarga de visitas
  useEffect(() => {
    let interval;
    let countdownInterval;
    let visitsInterval;

    async function processMinuteReminders() {
      try {
        const res = await fetch("/api/cron/process-minute-reminders");
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.sent > 0) {
          toast.success(`${data.sent} recordatorio(s) enviado(s)`);
          loadVisits();
        }

        if (data.nextReminders && data.nextReminders.length > 0) {
          const nearest = data.nextReminders.reduce((min, r) => 
            r.secondsUntilReminder < min.secondsUntilReminder ? r : min
          );
          setCountdown(nearest);
        } else {
          setCountdown(null);
        }
      } catch (error) {
        // silencio
      }
    }

    async function refreshVisits() {
      try {
        const res = await fetch("/api/patients");
        if (!res.ok) return;
        const data = await res.json();
        setVisits(data.items || []);
      } catch (e) {
        // silencio
      }
    }

    function updateCountdown() {
      if (countdown && countdown.secondsUntilReminder > 0) {
        setCountdown(prev => ({
          ...prev,
          secondsUntilReminder: prev.secondsUntilReminder - 1
        }));
      }
    }

    processMinuteReminders();
    interval = setInterval(processMinuteReminders, 10000);
    visitsInterval = setInterval(refreshVisits, 30000);
    countdownInterval = setInterval(updateCountdown, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(visitsInterval);
      clearInterval(countdownInterval);
    };
  }, [countdown]);

  const stats = useMemo(() => {
    const now = new Date();
    const total = visits.length;
    const upcoming = visits.filter((v) => new Date(v.followUpDate) >= now).length;
    const confirmed = visits.filter((v) => v.confirmationStatus === "confirmed").length;
    const pending = visits.filter((v) => !v.confirmationStatus || v.confirmationStatus === "pending").length;
    const cancelled = visits.filter((v) => v.confirmationStatus === "cancelled").length;
    const confirmationRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;
    
    return { total, upcoming, confirmed, pending, cancelled, confirmationRate };
  }, [visits]);

  const filteredVisits = useMemo(() => {
    return visits
      .filter((v) => {
        if (filterStatus === "all") return true;
        const status = v.confirmationStatus || "pending";
        return status === filterStatus;
      })
      .filter((v) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          v.patientName?.toLowerCase().includes(query) ||
          v.treatmentType?.toLowerCase().includes(query) ||
          v.patientPhone?.includes(query)
        );
      })
      .sort((a, b) => new Date(b.followUpDate) - new Date(a.followUpDate));
  }, [visits, filterStatus, searchQuery]);

  async function loadVisits() {
    setLoading(true);
    try {
      const res = await fetch("/api/patients");
      if (!res.ok) throw new Error("Error cargando pacientes");
      const data = await res.json();
      setVisits(data.items || []);
    } catch (error) {
      toast.error("Error al cargar los pacientes");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  // Atajos de teclado
  const shortcuts = [
    { key: "f", ctrlKey: true, handler: () => document.querySelector('input[placeholder*="Buscar"]')?.focus() },
    { key: "e", ctrlKey: true, handler: () => exportVisitsToCSV(filteredVisits, t) },
  ];
  useKeyboard(shortcuts);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Toaster position="top-right" richColors />
      
      <header className="sticky top-0 z-50 glass border-b border-white/20 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--aruba-turquoise)] to-[var(--aruba-orange)] rounded-xl blur-lg opacity-40" />
                <div className="relative bg-white dark:bg-slate-800 rounded-xl p-2 shadow-aruba-sm">
                  <Stethoscope className="w-6 h-6 text-[var(--aruba-turquoise)]" />
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gradient-hero">Odonto Reminder</h1>
                <p className="text-xs text-muted-foreground">{username}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Select value={lang} onValueChange={setLang}>
                <SelectTrigger className="w-[140px] h-9">
                  <Globe className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="pap">Papiamento</SelectItem>
                </SelectContent>
              </Select>
              
              <ThemeToggle />
              
              <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t.logout}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-fade-in">
          <StatCard
            title="Total Pacientes"
            value={stats.total}
            icon={Users}
            color="aruba-turquoise"
            subtitle={`${stats.upcoming} próximos controles`}
          />
          <StatCard
            title="Confirmados"
            value={stats.confirmed}
            icon={CheckCircle2}
            color="confirmed"
            subtitle={`${stats.confirmationRate}% tasa de confirmación`}
          />
          <StatCard
            title="Pendientes"
            value={stats.pending}
            icon={Clock}
            color="pending"
            subtitle="Esperando respuesta"
          />
          <StatCard
            title="Cancelados"
            value={stats.cancelled}
            icon={XCircle}
            color="cancelled"
            subtitle="Requieren reagenda"
          />
        </div>

        <PatientForm onSuccess={loadVisits} t={t} />

        <PatientFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filterStatus={filterStatus}
          onFilterChange={setFilterStatus}
        />

        <div className="flex justify-end mb-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportVisitsToCSV(filteredVisits, t)}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </Button>
        </div>

        <PatientTable
          visits={filteredVisits}
          loading={loading}
          searchQuery={searchQuery}
          filterStatus={filterStatus}
          onClearFilters={() => { setSearchQuery(""); setFilterStatus("all"); }}
          t={t}
          dateFormatter={dateFormatter}
          countdown={countdown}
        />

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          <p>Odonto Reminder Aruba © 2024 - Sistema de gestión de citas dentales</p>
        </footer>
      </main>
    </div>
  );
}
