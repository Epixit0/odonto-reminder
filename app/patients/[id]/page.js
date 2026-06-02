import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDictionary } from "@/lib/i18n";
import PatientStats from "@/components/patient/PatientStats";
import PatientTimeline from "@/components/patient/PatientTimeline";
import { ArrowLeft, User, Phone, Globe, Tag } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default async function PatientProfilePage({ params }) {
  const session = await getSession();
  if (!session?.username) {
    return notFound(); // O redirigir a login, pero notFound es seguro aquí
  }

  const { id } = await params;
  const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/patients/${id}`, {
    headers: {
      Cookie: `auth_token=${process.env.TEST_AUTH_TOKEN || ""}`, // Nota: en producción, pasar la cookie real o usar un patrón diferente
    },
    cache: "no-store",
  });

  // Fallback si la cookie no se pasa bien en SSR, hacemos la consulta directa a la DB
  // Para simplificar en este ejemplo, asumimos que el fetch con cookie funciona o hacemos la lógica en el cliente.
  // Mejor: hacer la lógica de DB directamente en el Server Component para evitar problemas de auth en fetch interno.
  
  const { connectDB } = await import("@/lib/db");
  const Patient = (await import("@/models/Patient")).default;
  const Visit = (await import("@/models/Visit")).default;

  await connectDB();
  const patient = await Patient.findById(id).lean();
  if (!patient) {
    return notFound();
  }

  const visits = await Visit.find({ patientId: id }).sort({ treatmentDate: -1 }).lean();

  const lang = "es"; // Podría venir de la URL o preferencia del usuario
  const t = getDictionary(lang);
  const dateFormatter = new Intl.DateTimeFormat("es-ES", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="sticky top-0 z-50 glass border-b border-white/20 dark:border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Volver al Dashboard
                </Button>
              </Link>
              <h1 className="text-lg font-bold text-gradient-hero">Historial del Paciente</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero del Paciente */}
        <Card className="glass-card mb-8 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[var(--aruba-turquoise)] to-[var(--aruba-orange)] flex items-center justify-center text-white text-3xl font-bold shadow-aruba">
                {patient.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <h2 className="text-3xl font-bold mb-2">{patient.name}</h2>
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Phone className="w-4 h-4" />
                    {patient.phone}
                  </div>
                  <div className="flex items-center gap-1">
                    <Globe className="w-4 h-4" />
                    {patient.language === "es" ? "Español" : patient.language === "en" ? "English" : "Papiamento"}
                  </div>
                  {patient.tags && patient.tags.length > 0 && (
                    <div className="flex items-center gap-1">
                      <Tag className="w-4 h-4" />
                      <div className="flex gap-1">
                        {patient.tags.map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Resumen de Actividad</h3>
          <PatientStats visits={visits} />
        </div>

        {/* Timeline */}
        <div>
          <h3 className="text-xl font-semibold mb-4">Historial de Visitas</h3>
          <PatientTimeline visits={visits} dateFormatter={dateFormatter} t={t} />
        </div>
      </main>
    </div>
  );
}
