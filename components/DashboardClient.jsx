"use client";

import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { getDictionary, t as tHelper } from "@/lib/i18n";
import {
  Stethoscope, LogOut, Globe, Users, CheckCircle2, XCircle, Clock,
  Download, LayoutDashboard, Shield, Table2, CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster, toast } from "sonner";
import StatCard from "@/components/dashboard/StatCard";
import PatientForm from "@/components/dashboard/PatientForm";
import PatientFilters from "@/components/dashboard/PatientFilters";
import PatientTable from "@/components/dashboard/PatientTable";
import CalendarView from "@/components/dashboard/CalendarView";
import PatientSheet from "@/components/dashboard/PatientSheet";
import Pagination from "@/components/dashboard/Pagination";
import { StaggerContainer, StaggerItem } from "@/components/dashboard/StaggerContainer";
import ThemeToggle from "@/components/ThemeToggle";
import Link from "next/link";
import { exportVisitsToCSV } from "@/lib/export";
import { useKeyboard } from "@/hooks/useKeyboard";

export default function DashboardClient({ username, initialVisits = [] }) {
  const [lang, setLang] = useState("es");
  const dict = useMemo(() => getDictionary(lang), [lang]);
  const [view, setView] = useState("table");

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
  const [loadingMore, setLoadingMore] = useState(false);
  const cursorRef = useRef(null);
  const [hasMore, setHasMore] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const loadVisits = useCallback(async () => {
    setLoading(true);
    cursorRef.current = null;
    try {
      const res = await fetch("/api/patients?limit=20");
      if (!res.ok) return;
      const data = await res.json();
      setVisits(data.items || []);
      cursorRef.current = data.nextCursor;
      setHasMore(data.hasMore);
    } catch {}
    finally { setLoading(false); }
  }, []);

  const loadMore = useCallback(async () => {
    if (!cursorRef.current || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await fetch(`/api/patients?cursor=${cursorRef.current}&limit=20`);
      if (!res.ok) return;
      const data = await res.json();
      setVisits((prev) => [...prev, ...(data.items || [])]);
      cursorRef.current = data.nextCursor;
      setHasMore(data.hasMore);
    } catch {}
    finally { setLoadingMore(false); }
  }, [loadingMore]);

  // Polling (solo refresca, no paginación completa — mantiene consistencia)
  useEffect(() => {
    loadVisits();
    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/patients?limit=20");
        if (!res.ok) return;
        const data = await res.json();
        setVisits(data.items || []);
        cursorRef.current = data.nextCursor;
        setHasMore(data.hasMore);
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [loadVisits]);

  // Polling modo minutos
  useEffect(() => {
    const hasPending = visits.some(
      (v) => v.notifyUnit === "minutes" && !v.sent5dPatient && (!v.confirmationStatus || v.confirmationStatus === "pending"),
    );
    if (!hasPending) return;
    const id = setInterval(() => { fetch("/api/cron/process-minute-reminders").catch(() => {}); }, 5000);
    return () => clearInterval(id);
  }, [visits]);

  // Polling citas programadas
  useEffect(() => {
    const hasPending = visits.some(
      (v) => v.notifyUnit !== "minutes" && !v.sent5dPatient && (!v.confirmationStatus || v.confirmationStatus === "pending") && new Date(v.followUpDate) > new Date(),
    );
    if (!hasPending) return;
    const id = setInterval(() => { fetch("/api/cron/process-appointment-reminders").catch(() => {}); }, 60000);
    return () => clearInterval(id);
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
        return (v.confirmationStatus || "pending") === filterStatus;
      })
      .filter((v) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          v.patientName?.toLowerCase().includes(q) ||
          v.treatmentType?.toLowerCase().includes(q) ||
          v.patientPhone?.includes(q)
        );
      })
      .sort((a, b) => new Date(b.followUpDate) - new Date(a.followUpDate));
  }, [visits, filterStatus, searchQuery]);

  async function handleRefresh() {
    setLoading(true);
    cursorRef.current = null;
    try {
      const res = await fetch("/api/patients?limit=20");
      if (!res.ok) throw new Error("Error");
      const data = await res.json();
      setVisits(data.items || []);
      cursorRef.current = data.nextCursor;
      setHasMore(data.hasMore);
    } catch {
      toast.error(tHelper(dict, "errorLoad"));
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    try {
      exportVisitsToCSV(filteredVisits, dict);
      toast.success(tHelper(dict, "exportSuccess"));
    } catch {
      toast.error(tHelper(dict, "errorExport"));
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  useKeyboard([
    { key: "f", ctrlKey: true, handler: () => document.querySelector('input[placeholder*="Buscar"]')?.focus() },
    { key: "e", ctrlKey: true, handler: handleExport },
  ]);

  const statConfigs = [
    { key: "totalPatients", value: stats.total, icon: Users, color: "aruba-turquoise", subtitle: tHelper(dict, "upcomingAppointments", { count: stats.upcoming }) },
    { key: "confirmed", value: stats.confirmed, icon: CheckCircle2, color: "confirmed", subtitle: tHelper(dict, "confirmationRate", { rate: stats.confirmationRate }) },
    { key: "pending", value: stats.pending, icon: Clock, color: "pending", subtitle: tHelper(dict, "waitingResponse") },
    { key: "cancelled", value: stats.cancelled, icon: XCircle, color: "cancelled", subtitle: tHelper(dict, "needsReschedule") },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Toaster position="top-right" richColors />

      <header className="sticky top-0 z-50 bg-gradient-header border-b border-white/10 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-white/20 rounded-xl blur-md" />
                <div className="relative bg-white/10 backdrop-blur-sm rounded-xl p-1.5 sm:p-2 border border-white/20">
                  <Stethoscope className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-sm sm:text-base font-bold text-white tracking-tight">
                  Odonto <span className="text-[#5eead4]">Reminder</span>
                </h1>
                <p className="text-[9px] sm:text-[10px] text-white/50 tracking-wider uppercase hidden sm:block">
                  {tHelper(dict, "appSubtitle")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-3">
              <div className="hidden md:flex items-center gap-1">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs font-medium border border-white/10">
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  {tHelper(dict, "navDashboard")}
                </div>
                <Link href="/admin">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/5 text-xs font-medium transition-all cursor-pointer">
                    <Shield className="w-3.5 h-3.5" />
                    Admin
                  </div>
                </Link>
              </div>

              <div className="hidden sm:block w-px h-5 bg-white/10" />

              <Select value={lang} onValueChange={setLang}>
                <SelectTrigger className="w-[90px] sm:w-[120px] h-7 sm:h-8 bg-white/10 border-white/10 text-white text-[10px] sm:text-xs hover:bg-white/20 transition-all">
                  <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 text-white/60 shrink-0" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="pap">Papiamento</SelectItem>
                </SelectContent>
              </Select>

              <ThemeToggle />

              <div className="flex items-center gap-1 sm:gap-2 pl-1 sm:pl-2 border-l border-white/10">
                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-[#5eead4] to-[#14b8a6] flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-white shadow-lg">
                  {username?.charAt(0).toUpperCase() || "A"}
                </div>
                <Button variant="ghost" size="sm" onClick={logout} className="h-6 sm:h-7 text-white/50 hover:text-white hover:bg-white/10 text-[10px] sm:text-xs px-1.5 sm:px-2">
                  <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex items-center justify-between mb-4 sm:mb-8 animate-fade-in">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-gradient-hero">{tHelper(dict, "dashboardTitle")}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
              {tHelper(dict, "systemSummary", { total: stats.total })}. {username}
            </p>
          </div>
        </div>

        {/* Stats Grid con stagger animation */}
        <StaggerContainer className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-8">
          {statConfigs.map((s) => (
            <StaggerItem key={s.key}>
              <StatCard title={s.key} value={s.value} icon={s.icon} color={s.color} subtitle={s.subtitle} dict={dict} />
            </StaggerItem>
          ))}
        </StaggerContainer>

        <PatientForm onSuccess={handleRefresh} dict={dict} />

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <Tabs value={view} onValueChange={setView} className="w-full sm:w-auto">
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="table" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-initial">
                <Table2 className="w-3.5 h-3.5" />
                {tHelper(dict, "table")}
              </TabsTrigger>
              <TabsTrigger value="calendar" className="gap-1.5 text-xs sm:text-sm flex-1 sm:flex-initial">
                <CalendarDays className="w-3.5 h-3.5" />
                {tHelper(dict, "calendar")}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-xs h-8 sm:h-9">
              <Download className="w-3.5 h-3.5" />
              {tHelper(dict, "exportCSV")}
            </Button>
          </div>
        </div>

        {view === "table" ? (
          <>
            <PatientFilters
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filterStatus={filterStatus}
              onFilterChange={setFilterStatus}
              dict={dict}
            />
            <PatientTable
              visits={filteredVisits}
              loading={loading}
              searchQuery={searchQuery}
              filterStatus={filterStatus}
              onClearFilters={() => { setSearchQuery(""); setFilterStatus("all"); }}
              dict={dict}
              dateFormatter={dateFormatter}
              onPatientClick={(id) => { setSelectedPatientId(id); setSheetOpen(true); }}
            />
            <Pagination
              cursor={cursorRef.current}
              hasMore={hasMore}
              loading={loadingMore}
              onLoadMore={loadMore}
              dict={dict}
            />
          </>
        ) : (
          <CalendarView
            visits={filteredVisits}
            dateFormatter={dateFormatter}
            dict={dict}
          />
        )}

        <footer className="mt-8 sm:mt-12 pt-4 sm:pt-6 border-t border-border text-center text-[10px] sm:text-xs text-muted-foreground">
          <p>{tHelper(dict, "footer", { year: "2026" })}</p>
        </footer>
      </main>

      <PatientSheet
        patientId={selectedPatientId}
        open={sheetOpen}
        onOpenChange={(open) => { setSheetOpen(open); if (!open) setSelectedPatientId(null); }}
        dict={dict}
      />
    </div>
  );
}
