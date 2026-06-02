"use client";

import { useMemo, useState, useEffect } from "react";
import { getDictionary } from "@/lib/i18n";
import { Stethoscope, LogOut, Globe, Users, CheckCircle2, XCircle, Clock, Download, LayoutDashboard, Activity, ChevronDown } from "lucide-react";
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
    const locale = lang === "en" ? "en-US" : "es-ES";
    return new Intl.DateTimeFormat(locale, {
      timeZone: "America/Aruba",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, [lang]);

  const [visits, setVisits] = useState(initialVisits);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Recarga de visitas cada 30s para confirmaciones entrantes
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/patients");
        if (!res.ok) return;
        const data = await res.json();
        setVisits(data.items || []);
      } catch (e) {}
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Polling recordatorios modo minutos (prueba)
  useEffect(() => {
    const hasPendingMinute = visits.some(
      (v) =>
        v.notifyUnit === "minutes" &&
        !v.sent5dPatient &&
        (v.confirmationStatus === "pending" || !v.confirmationStatus),
    );
    if (!hasPendingMinute) return;

    async function tick() {
      try {
        await fetch("/api/cron/process-minute-reminders");
      } catch (e) {}
    }
    tick();
    const interval = setInterval(tick, 5000);
    return () => clearInterval(interval);
  }, [visits]);

  // Polling citas programadas (Hobby Vercel: cron solo 1×/día; esto dispara a las 6 h antes)
  useEffect(() => {
    const hasPendingAppointment = visits.some(
      (v) =>
        v.notifyUnit !== "minutes" &&
        !v.sent5dPatient &&
        (v.confirmationStatus === "pending" || !v.confirmationStatus) &&
        new Date(v.followUpDate) > new Date(),
    );
    if (!hasPendingAppointment) return;

    async function tick() {
      try {
        await fetch("/api/cron/process-appointment-reminders");
      } catch (e) {}
    }
    tick();
    const interval = setInterval(tick, 60000);
    return () => clearInterval(interval);
  }, [visits]);

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

  const shortcuts = [
    { key: "f", ctrlKey: true, handler: () => document.querySelector('input[placeholder*="Buscar"]')?.focus() },
    { key: "e", ctrlKey: true, handler: () => exportVisitsToCSV(filteredVisits, t) },
  ];
  useKeyboard(shortcuts);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Toaster position="top-right" richColors />
      
      {/* ===== HEADER REDISEÑADO ===== */}
      <header className="sticky top-0 z-50 bg-gradient-header border-b border-white/10 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo + Marca */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-xl blur-md" />
                <div className="relative bg-white/10 backdrop-blur-sm rounded-xl p-2 border border-white/20">
                  <Stethoscope className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-base font-bold text-white tracking-tight">
                  Odonto <span className="text-[#5eead4]">Reminder</span>
                </h1>
                <p className="text-[10px] text-white/50 tracking-wider uppercase">Aruba · Dental Care</p>
              </div>
            </div>

            {/* Navegación + Controles */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Nav items */}
              <div className="hidden md:flex items-center gap-1">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium border border-white/10">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Dashboard
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 text-xs font-medium transition-all cursor-pointer">
                  <Activity className="w-3.5 h-3.5" />
                  Actividad
                </div>
              </div>

              {/* Separador */}
              <div className="hidden sm:block w-px h-6 bg-white/10" />

              {/* Selector idioma */}
              <Select value={lang} onValueChange={setLang}>
                <SelectTrigger className="w-[120px] h-8 bg-white/10 border-white/10 text-white text-xs hover:bg-white/20 transition-all">
                  <Globe className="w-3.5 h-3.5 mr-1.5 text-white/60" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="pap">Papiamento</SelectItem>
                </SelectContent>
              </Select>

              <ThemeToggle />

              {/* Avatar usuario + Logout */}
              <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#5eead4] to-[#14b8a6] flex items-center justify-center text-[10px] font-bold text-white shadow-lg">
                  {username?.charAt(0).toUpperCase() || "A"}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={logout} 
                  className="h-7 text-white/50 hover:text-white hover:bg-white/10 text-xs px-2 hidden sm:flex"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h2 className="text-2xl font-bold text-gradient-hero">Panel de Control</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Bienvenido, {username}. {stats.total} pacientes en el sistema.
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
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
        />

        <footer className="mt-12 pt-6 border-t border-border text-center text-xs text-muted-foreground">
          <p>Odonto Reminder Aruba © 2024 — Hecho con ❤️ para tu clínica dental</p>
        </footer>
      </main>
    </div>
  );
}
