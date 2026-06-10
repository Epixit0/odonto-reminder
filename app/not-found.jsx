import { Button } from "@/components/ui/button";
import { Stethoscope, ArrowLeft, Home } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[var(--aruba-turquoise)] to-[var(--aruba-turquoise-light)] flex items-center justify-center shadow-lg">
          <Stethoscope className="w-8 h-8 text-white" />
        </div>

        <h1 className="text-6xl font-bold mb-2 text-gradient-hero">404</h1>
        <p className="text-xl font-semibold mb-2">Página no encontrada</p>
        <p className="text-muted-foreground mb-8">
          La página que buscas no existe o fue movida.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard">
            <Button className="btn-aruba gap-2">
              <Home className="w-4 h-4" />
              Ir al Dashboard
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Iniciar sesión
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
