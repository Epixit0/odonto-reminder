"use client";

import { Button } from "@/components/ui/button";
import { Stethoscope, AlertTriangle, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function Error({ error, reset }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[var(--aruba-coral)] to-[var(--aruba-orange)] flex items-center justify-center shadow-lg">
          <AlertTriangle className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-2xl font-bold mb-2 text-gradient-hero">
          Algo salió mal
        </h1>
        <p className="text-muted-foreground mb-2">
          Ocurrió un error inesperado. No te preocupes, tus datos están seguros.
        </p>
        <p className="text-xs text-muted-foreground/60 mb-8 font-mono">
          {error?.message || "Error desconocido"}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} className="btn-aruba gap-2">
            <RefreshCw className="w-4 h-4" />
            Intentar de nuevo
          </Button>
          <Link href="/dashboard">
            <Button variant="outline" className="gap-2 w-full">
              <ArrowLeft className="w-4 h-4" />
              Volver al Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
