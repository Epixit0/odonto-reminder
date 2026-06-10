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
import { t as tHelper } from "@/lib/i18n";

export default async function PatientProfilePage({ params }) {
  const session = await getSession();
  if (!session?.username) {
    return notFound();
  }

  const { id } = await params;
  const lang = "es";
  const dict = getDictionary(lang);

  const { connectDB } = await import("@/lib/db");
  const Patient = (await import("@/models/Patient")).default;
  const Visit = (await import("@/models/Visit")).default;

  await connectDB();
  const patient = await Patient.findById(id).lean();
  if (!patient) return notFound();

  const visits = await Visit.find({ patientId: id }).sort({ treatmentDate: -1 }).lean();

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
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="gap-2 text-xs sm:text-sm">
                  <ArrowLeft className="w-4 h-4" />
                  {tHelper(dict, "backToDashboard")}
                </Button>
              </Link>
              <h1 className="text-base sm:text-lg font-bold text-gradient-hero hidden sm:block">
                {tHelper(dict, "patientProfile")}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Hero del Paciente */}
        <Card className="glass-card mb-6 sm:mb-8 overflow-hidden">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-[var(--aruba-turquoise)] to-[var(--aruba-orange)] flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-aruba shrink-0">
                {patient.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl sm:text-3xl font-bold mb-1 sm:mb-2 truncate">{patient.name}</h2>
                <div className="flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    <span className="truncate">{patient.phone}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                    {patient.language === "es" ? "Español" : patient.language === "en" ? "English" : "Papiamento"}
                  </div>
                  {patient.tags?.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                      {patient.tags.map((tag, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px] sm:text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas */}
        <div className="mb-6 sm:mb-8">
          <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
            {tHelper(dict, "activitySummary")}
          </h3>
          <PatientStats visits={visits} dict={dict} />
        </div>

        {/* Timeline */}
        <div>
          <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
            {tHelper(dict, "visitHistory")}
          </h3>
          <PatientTimeline visits={visits} dateFormatter={dateFormatter} dict={dict} />
        </div>
      </main>
    </div>
  );
}
