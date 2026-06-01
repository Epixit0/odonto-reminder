"use client";

import { useMemo, useState, useEffect } from 'react';
import { getDictionary } from '@/lib/i18n';
import { 
  Stethoscope, 
  Users, 
  Calendar, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  LogOut, 
  Plus, 
  Search,
  Filter,
  ChevronDown,
  Phone,
  Globe,
  Loader2,
  Bell,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Toaster, toast } from 'sonner';
import PatientRow from '@/components/PatientRow';

const COUNTRY_OPTIONS = [
  { code: '+297', shortLabel: 'AW +297', fullLabel: '🇦🇼 Aruba (+297)', minDigits: 7, maxDigits: 7 },
  { code: '+599', shortLabel: 'CW +599', fullLabel: '🇨🇼 Curazao (+599)', minDigits: 7, maxDigits: 7 },
  { code: '+1', shortLabel: 'US +1', fullLabel: '🇺🇸 USA (+1)', minDigits: 10, maxDigits: 10 },
  { code: '+34', shortLabel: 'ES +34', fullLabel: '🇪🇸 España (+34)', minDigits: 9, maxDigits: 9 },
  { code: '+57', shortLabel: 'CO +57', fullLabel: '🇨🇴 Colombia (+57)', minDigits: 10, maxDigits: 10 },
  { code: '+58', shortLabel: 'VE +58', fullLabel: '🇻🇪 Venezuela (+58)', minDigits: 10, maxDigits: 10 },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos', color: 'default' },
  { value: 'pending', label: 'Pendientes', color: 'pending' },
  { value: 'confirmed', label: 'Confirmados', color: 'confirmed' },
  { value: 'cancelled', label: 'Cancelados', color: 'cancelled' },
];

function StatusBadge({ status, t }) {
  const configs = {
    confirmed: { 
      icon: CheckCircle2, 
      className: 'badge-confirmed',
      label: t?.confirmed || 'Confirmado'
    },
    pending: { 
      icon: Clock, 
      className: 'badge-pending',
      label: t?.pending || 'Pendiente'
    },
    cancelled: { 
      icon: XCircle, 
      className: 'badge-cancelled',
      label: t?.cancelled || 'Cancelado'
    },
  };

  const config = configs[status] || configs.pending;
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`${config.className} gap-1.5 font-medium`}>
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </Badge>
  );
}

function StatCard({ title, value, icon: Icon, color, subtitle }) {
  return (
    <Card className="glass-card hover-lift overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <div className={`p-3 rounded-xl bg-${color}/10`}>
            <Icon className={`w-5 h-5 text-${color}`} style={{ color: `var(--${color})` }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardClient({ username, initialVisits = [] }) {
  const [lang, setLang] = useState('es');
  const t = useMemo(() => getDictionary(lang), [lang]);
  
  const dateFormatter = useMemo(() => {
    const locale = lang === 'en' ? 'en-US' : lang === 'pap' ? 'es-ES' : 'es-ES';
    return new Intl.DateTimeFormat(locale, {
      timeZone: 'UTC',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }, [lang]);

  const [form, setForm] = useState({
    patientName: '',
    countryCode: '+297',
    localPhone: '',
    language: 'es',
    treatmentType: '',
    treatmentDate: '',
    notifyValue: '3',
    notifyUnit: 'months',
  });
  
  const [visits, setVisits] = useState(initialVisits);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [pollingStatus, setPollingStatus] = useState('idle');

  // Polling para recordatorios por minuto
  useEffect(() => {
    let interval;
    let countdownInterval;

    async function processMinuteReminders() {
      try {
        setPollingStatus('checking');
        const res = await fetch('/api/cron/process-minute-reminders');
        if (!res.ok) return;
        const data = await res.json();
        
        if (data.sent > 0) {
          toast.success(`${data.sent} recordatorio(s) enviado(s)`);
          loadVisits();
        }

        // Actualizar countdown
        if (data.nextReminders && data.nextReminders.length > 0) {
          const nearest = data.nextReminders.reduce((min, r) => 
            r.secondsUntilReminder < min.secondsUntilReminder ? r : min
          );
          setCountdown(nearest);
        } else {
          setCountdown(null);
        }
        
        setPollingStatus(data.sent > 0 ? 'sent' : 'idle');
      } catch (error) {
        setPollingStatus('idle');
      }
    }

    // Countdown regresivo
    function updateCountdown() {
      if (countdown && countdown.secondsUntilReminder > 0) {
        setCountdown(prev => ({
          ...prev,
          secondsUntilReminder: prev.secondsUntilReminder - 1
        }));
      }
    }

    // Revisar cada 10 segundos
    processMinuteReminders(); // Inmediato al cargar
    interval = setInterval(processMinuteReminders, 10000);
    countdownInterval = setInterval(updateCountdown, 1000);

    return () => {
      clearInterval(interval);
      clearInterval(countdownInterval);
    };
  }, []);

  // Estadísticas
  const stats = useMemo(() => {
    const now = new Date();
    const total = visits.length;
    const upcoming = visits.filter((v) => new Date(v.followUpDate) >= now).length;
    const confirmed = visits.filter((v) => v.confirmationStatus === 'confirmed').length;
    const pending = visits.filter((v) => !v.confirmationStatus || v.confirmationStatus === 'pending').length;
    const cancelled = visits.filter((v) => v.confirmationStatus === 'cancelled').length;
    
    const confirmationRate = total > 0 ? Math.round((confirmed / total) * 100) : 0;
    
    return { total, upcoming, confirmed, pending, cancelled, confirmationRate };
  }, [visits]);

  // Filtrar visitas
  const filteredVisits = useMemo(() => {
    return visits
      .filter((v) => {
        if (filterStatus === 'all') return true;
        const status = v.confirmationStatus || 'pending';
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

  const selectedCountry = useMemo(
    () => COUNTRY_OPTIONS.find((country) => country.code === form.countryCode) || COUNTRY_OPTIONS[0],
    [form.countryCode]
  );

  function handleCountryChange(code) {
    const country = COUNTRY_OPTIONS.find((item) => item.code === code) || COUNTRY_OPTIONS[0];
    setForm((prev) => ({
      ...prev,
      countryCode: code,
      localPhone: prev.localPhone.replace(/\D/g, '').slice(0, country.maxDigits),
    }));
  }

  function handleLocalPhoneChange(value) {
    const digits = value.replace(/\D/g, '').slice(0, selectedCountry.maxDigits);
    setForm((prev) => ({ ...prev, localPhone: digits }));
  }

  async function loadVisits() {
    setLoading(true);
    try {
      const res = await fetch('/api/patients');
      if (!res.ok) throw new Error('Error cargando pacientes');
      const data = await res.json();
      setVisits(data.items || []);
    } catch (error) {
      toast.error('Error al cargar los pacientes');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    const digits = form.localPhone.replace(/\D/g, '');
    if (digits.length < selectedCountry.minDigits || digits.length > selectedCountry.maxDigits) {
      toast.error(`Número inválido para ${selectedCountry.fullLabel}`);
      setSaving(false);
      return;
    }

    const payload = {
      patientName: form.patientName,
      patientPhone: `${form.countryCode}${digits}`,
      language: form.language,
      treatmentType: form.treatmentType,
      treatmentDate: form.treatmentDate,
      notifyValue: form.notifyValue,
      notifyUnit: form.notifyUnit,
    };

    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Error guardando paciente');

      toast.success('Paciente registrado exitosamente');
      
      setForm({
        patientName: '',
        countryCode: '+297',
        localPhone: '',
        language: 'es',
        treatmentType: '',
        treatmentDate: '',
        notifyValue: '3',
        notifyUnit: 'months',
      });
      
      setShowAddForm(false);
      loadVisits();
    } catch (error) {
      toast.error('Error al guardar el paciente');
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Toaster position="top-right" richColors />
      
      {/* Header */}
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
              
              <Button variant="ghost" size="sm" onClick={logout} className="gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t.logout}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
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

        {/* Indicador de próximos recordatorios */}
        {countdown && (
          <div className="mb-6 glass-card rounded-xl p-4 border border-amber-200/50 bg-amber-50/50 dark:bg-amber-900/10 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Próximo recordatorio por minuto
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {countdown.name} - ({countdown.type})
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-amber-700 dark:text-amber-200 tabular-nums">
                  {countdown.secondsUntilReminder > 60
                    ? `${Math.floor(countdown.secondsUntilReminder / 60)}m ${countdown.secondsUntilReminder % 60}s`
                    : `${countdown.secondsUntilReminder}s`}
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  para enviar recordatorio
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Formulario de registro colapsable */}
        <Card className="glass-card mb-8 overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--aruba-turquoise)]/10">
                  <Plus className="w-5 h-5 text-[var(--aruba-turquoise)]" />
                </div>
                <div>
                  <CardTitle className="text-lg">{t.dashboardTitle}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Registre un nuevo paciente para seguimiento
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => setShowAddForm(!showAddForm)}
                className="gap-2"
              >
                {showAddForm ? 'Ocultar formulario' : 'Nuevo paciente'}
                <ChevronDown className={`w-4 h-4 transition-transform ${showAddForm ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          
          {showAddForm && (
            <CardContent className="pt-0 animate-slide-up">
              <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t.patientName}</Label>
                  <Input
                    placeholder="Nombre completo"
                    value={form.patientName}
                    onChange={(e) => setForm((p) => ({ ...p, patientName: e.target.value }))}
                    required
                    className="input-aruba"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t.patientPhone}</Label>
                  <div className="flex gap-2">
                    <Select value={form.countryCode} onValueChange={handleCountryChange}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_OPTIONS.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.fullLabel}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder={`${selectedCountry.minDigits}-${selectedCountry.maxDigits} dígitos`}
                      value={form.localPhone}
                      onChange={(e) => handleLocalPhoneChange(e.target.value)}
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={selectedCountry.maxDigits}
                      required
                      className="input-aruba flex-1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Idioma de mensajes</Label>
                  <Select value={form.language} onValueChange={(value) => setForm((p) => ({ ...p, language: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="es">Español</SelectItem>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="pap">Papiamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t.treatment}</Label>
                  <Input
                    placeholder="Tipo de tratamiento"
                    value={form.treatmentType}
                    onChange={(e) => setForm((p) => ({ ...p, treatmentType: e.target.value }))}
                    required
                    className="input-aruba"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t.treatmentDate}</Label>
                  <Input
                    type="date"
                    value={form.treatmentDate}
                    onChange={(e) => setForm((p) => ({ ...p, treatmentDate: e.target.value }))}
                    required
                    className="input-aruba"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Recordatorio</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      value={form.notifyValue}
                      onChange={(e) => setForm((p) => ({ ...p, notifyValue: e.target.value }))}
                      required
                      className="input-aruba w-20"
                    />
                    <Select value={form.notifyUnit} onValueChange={(value) => setForm((p) => ({ ...p, notifyUnit: value }))}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutos (prueba)</SelectItem>
                        <SelectItem value="days">Días</SelectItem>
                        <SelectItem value="weeks">Semanas</SelectItem>
                        <SelectItem value="months">Meses</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="md:col-span-2 lg:col-span-3 flex justify-end">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="btn-aruba gap-2 min-w-[160px]"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4" />
                        {t.save}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          )}
        </Card>

        {/* Filtros y búsqueda */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar paciente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 input-aruba"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Tabla de pacientes */}
        <Card className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t.patientName}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      Contacto
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {t.treatment}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {t.nextVisit}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Recordatorio
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-6 w-24" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-8 w-20" /></td>
                    </tr>
                  ))
                ) : filteredVisits.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-4 rounded-full bg-muted">
                          <AlertCircle className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-muted-foreground">
                          {searchQuery || filterStatus !== 'all' 
                            ? 'No se encontraron pacientes con estos filtros'
                            : 'No hay pacientes registrados'}
                        </p>
                        {(searchQuery || filterStatus !== 'all') && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => { setSearchQuery(''); setFilterStatus('all'); }}
                          >
                            Limpiar filtros
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredVisits.map((v) => {
                    // Buscar countdown para esta visita
                    const visitCountdown = countdown && countdown.id === v._id ? countdown : null;
                    return (
                      <PatientRow
                        key={v._id}
                        visit={v}
                        dateFormatter={dateFormatter}
                        t={t}
                        countdown={visitCountdown}
                      />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Footer */}
        <footer className="mt-8 text-center text-xs text-muted-foreground">
          <p>Odonto Reminder Aruba © 2024 - Sistema de gestión de citas dentales</p>
        </footer>
      </main>
    </div>
  );
}
