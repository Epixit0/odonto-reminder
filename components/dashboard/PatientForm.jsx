"use client";

import { useState, useMemo } from "react";
import { Plus, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const COUNTRY_OPTIONS = [
  { code: "+297", shortLabel: "AW +297", fullLabel: "🇦🇼 Aruba (+297)", minDigits: 7, maxDigits: 7 },
  { code: "+599", shortLabel: "CW +599", fullLabel: "🇨🇼 Curazao (+599)", minDigits: 7, maxDigits: 7 },
  { code: "+1", shortLabel: "US +1", fullLabel: "🇺🇸 USA (+1)", minDigits: 10, maxDigits: 10 },
  { code: "+34", shortLabel: "ES +34", fullLabel: "🇪🇸 España (+34)", minDigits: 9, maxDigits: 9 },
  { code: "+57", shortLabel: "CO +57", fullLabel: "🇨🇴 Colombia (+57)", minDigits: 10, maxDigits: 10 },
  { code: "+58", shortLabel: "VE +58", fullLabel: "🇻🇪 Venezuela (+58)", minDigits: 10, maxDigits: 10 },
];

export default function PatientForm({ onSuccess, t }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    patientName: "",
    countryCode: "+297",
    localPhone: "",
    language: "es",
    treatmentType: "",
    treatmentDate: "",
    notifyValue: "3",
    notifyUnit: "months",
  });

  const selectedCountry = useMemo(
    () => COUNTRY_OPTIONS.find((country) => country.code === form.countryCode) || COUNTRY_OPTIONS[0],
    [form.countryCode]
  );

  function handleCountryChange(code) {
    const country = COUNTRY_OPTIONS.find((item) => item.code === code) || COUNTRY_OPTIONS[0];
    setForm((prev) => ({
      ...prev,
      countryCode: code,
      localPhone: prev.localPhone.replace(/\D/g, "").slice(0, country.maxDigits),
    }));
  }

  function handleLocalPhoneChange(value) {
    const digits = value.replace(/\D/g, "").slice(0, selectedCountry.maxDigits);
    setForm((prev) => ({ ...prev, localPhone: digits }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    const digits = form.localPhone.replace(/\D/g, "");
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
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Error guardando paciente");

      toast.success("Paciente registrado exitosamente");
      setForm({
        patientName: "",
        countryCode: "+297",
        localPhone: "",
        language: "es",
        treatmentType: "",
        treatmentDate: "",
        notifyValue: "3",
        notifyUnit: "months",
      });
      setShowForm(false);
      onSuccess?.();
    } catch (error) {
      toast.error("Error al guardar el paciente");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="glass-card mb-8 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--aruba-turquoise)]/10">
              <Plus className="w-5 h-5 text-[var(--aruba-turquoise)]" />
            </div>
            <div>
              <CardTitle className="text-lg">{t?.dashboardTitle || "Registro de pacientes"}</CardTitle>
              <p className="text-sm text-muted-foreground">
                Registre un nuevo paciente para seguimiento
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setShowForm(!showForm)} className="gap-2">
            {showForm ? "Ocultar formulario" : "Nuevo paciente"}
            <ChevronDown className={`w-4 h-4 transition-transform ${showForm ? "rotate-180" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      {showForm && (
        <CardContent className="pt-0 animate-slide-up">
          <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t?.patientName || "Nombre"}</Label>
              <Input
                placeholder="Nombre completo"
                value={form.patientName}
                onChange={(e) => setForm((p) => ({ ...p, patientName: e.target.value }))}
                required
                className="input-aruba"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t?.patientPhone || "WhatsApp"}</Label>
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
              <Label className="text-sm font-medium">{t?.treatment || "Tratamiento"}</Label>
              <Input
                placeholder="Tipo de tratamiento"
                value={form.treatmentType}
                onChange={(e) => setForm((p) => ({ ...p, treatmentType: e.target.value }))}
                required
                className="input-aruba"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">{t?.treatmentDate || "Fecha"}</Label>
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
              <Button type="submit" disabled={saving} className="btn-aruba gap-2 min-w-[160px]">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    {t?.save || "Guardar"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      )}
    </Card>
  );
}
