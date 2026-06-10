"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import StatusBadge from "@/components/dashboard/StatusBadge";

const HOURS = Array.from({ length: 11 }, (_, i) => `${i + 8}:00`);
const DAY_NAMES = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DAY_NAMES_MOBILE = ["L", "M", "M", "J", "V", "S"];

export default function CalendarView({ visits, dateFormatter, dict }) {
  const [weekOffset, setWeekOffset] = useState(0);

  const weekDays = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    const day = today.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday as first day
    startOfWeek.setDate(today.getDate() + diff + weekOffset * 7);
    startOfWeek.setHours(0, 0, 0, 0);

    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  // Agrupar visits por día
  const visitsByDay = useMemo(() => {
    const map = {};
    weekDays.forEach((d) => {
      const key = d.toDateString();
      map[key] = [];
    });
    visits?.forEach((v) => {
      const d = new Date(v.followUpDate).toDateString();
      if (map[d]) map[d].push(v);
    });
    return map;
  }, [visits, weekDays]);

  const todayStr = new Date().toDateString();
  const isCurrentWeek = weekOffset === 0;
  const weekDaysNames = typeof window !== "undefined" && window.innerWidth < 640
    ? DAY_NAMES_MOBILE
    : DAY_NAMES;

  if (!visits || visits.length === 0) {
    return (
      <Card className="glass-card p-6 sm:p-8 text-center">
        <Clock className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          {dict ? (dict.calendar || "No hay citas esta semana") : "No hay citas esta semana"}
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Navegación de semana */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset(weekOffset - 1)} className="gap-1 text-xs">
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Semana anterior</span>
        </Button>
        <span className="text-sm font-medium">
          {isCurrentWeek ? (dict?.today || "Esta semana") : `${weekDays[0]?.toLocaleDateString()?.slice(0, -5) || ""}`}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setWeekOffset(weekOffset + 1)} className="gap-1 text-xs">
          <span className="hidden sm:inline">Siguiente semana</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Grid de días */}
      <div className="grid grid-cols-6 gap-1 sm:gap-2">
        {/* Headers */}
        {weekDaysNames.map((name, i) => {
          const d = weekDays[i];
          const isToday = d?.toDateString() === todayStr;
          return (
            <div key={name} className="text-center mb-1">
              <div className="text-[10px] sm:text-xs font-medium text-muted-foreground">{name}</div>
              <div
                className={`text-xs sm:text-sm font-bold mt-0.5 w-6 h-6 sm:w-8 sm:h-8 mx-auto flex items-center justify-center rounded-full ${
                  isToday ? "bg-[var(--aruba-turquoise)] text-white" : ""
                }`}
              >
                {d?.getDate()}
              </div>
            </div>
          );
        })}

        {/* Celdas de citas */}
        {weekDays.map((day) => {
          const key = day.toDateString();
          const dayVisits = visitsByDay[key] || [];
          const isToday = key === todayStr;

          return (
            <div
              key={key}
              className={`min-h-[80px] sm:min-h-[120px] rounded-lg border p-1 sm:p-2 ${
                isToday ? "border-[var(--aruba-turquoise)] bg-[var(--aruba-turquoise)]/5" : "border-border"
              }`}
            >
              {dayVisits.length === 0 ? (
                <p className="text-[9px] sm:text-xs text-muted-foreground/40 text-center mt-3 sm:mt-6">—</p>
              ) : (
                <div className="space-y-1">
                  {dayVisits.slice(0, 3).map((v) => (
                    <div
                      key={v._id}
                      className={`text-[9px] sm:text-xs p-1 rounded truncate font-medium ${
                        v.confirmationStatus === "confirmed"
                          ? "bg-[var(--confirmed)]/15 text-[var(--confirmed)]"
                          : v.confirmationStatus === "cancelled"
                            ? "bg-[var(--cancelled)]/15 text-[var(--cancelled)] line-through"
                            : "bg-amber-500/15 text-amber-700"
                      }`}
                    >
                      {v.patientName?.split(" ")[0]}
                    </div>
                  ))}
                  {dayVisits.length > 3 && (
                    <p className="text-[9px] text-muted-foreground text-center">
                      +{dayVisits.length - 3} más
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
