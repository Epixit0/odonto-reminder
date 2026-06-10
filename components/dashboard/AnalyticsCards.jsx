"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { computeAnalytics, groupVisitsByMonth, groupVisitsByTreatment } from "@/lib/analytics";
import { t as tHelper } from "@/lib/i18n";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar,
} from "recharts";

const COLORS = {
  confirmed: "#10b981",
  pending: "#f59e0b",
  cancelled: "#f43f5e",
  turquoise: "#00A8B5",
};

export default function AnalyticsCards({ visits, dict }) {
  const analytics = useMemo(() => computeAnalytics(visits), [visits]);
  const monthlyData = useMemo(() => groupVisitsByMonth(visits), [visits]);
  const treatmentData = useMemo(() => groupVisitsByTreatment(visits), [visits]);

  const pieData = [
    { name: tHelper(dict, "confirmed"), value: analytics.confirmed, color: COLORS.confirmed },
    { name: tHelper(dict, "pending"), value: analytics.pending, color: COLORS.pending },
    { name: tHelper(dict, "cancelled"), value: analytics.cancelled, color: COLORS.cancelled },
  ].filter((d) => d.value > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-8">
      {/* Tasa de confirmación (donut) */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {tHelper(dict, "confirmationRate", { rate: analytics.confirmationRate })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={40}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 text-xs sm:text-sm">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-medium ml-auto">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tendencia mensual (line) */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {tHelper(dict, "visitHistory")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-28 sm:h-32">
            {monthlyData.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) => v.split("-")[1] + "/" + v.slice(2, 4)}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={25} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={COLORS.turquoise}
                    strokeWidth={2}
                    dot={{ r: 3, fill: COLORS.turquoise }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground flex items-center justify-center h-full">
                {tHelper(dict, "loading")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tratamientos populares (bar) — Ocupa ancho completo */}
      <Card className="glass-card lg:col-span-2">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">
            {tHelper(dict, "treatment")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32 sm:h-40">
            {treatmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={treatmentData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    width={90}
                    tickFormatter={(v) => v.length > 12 ? v.slice(0, 12) + "..." : v}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="value" fill={COLORS.turquoise} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-muted-foreground flex items-center justify-center h-full">
                {tHelper(dict, "loading")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
