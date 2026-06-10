"use client";

import { useState, useMemo, useCallback } from "react";
import { Plus, Loader2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { t as tHelper } from "@/lib/i18n";
import PatientCombobox from "@/components/dashboard/PatientCombobox";

const COUNTRY_OPTIONS = [
  { code: "+297", shortLabel: "AW +297", fullLabel: "🇦🇼 Aruba (+297)", minDigits: 7, maxDigits: 7 },
  { code: "+599", shortLabel: "CW +599", fullLabel: "🇨🇼 Curazao (+599)", minDigits: 7, maxDigits: 7 },
  { code: "+1", shortLabel: "US +1", fullLabel: "🇺🇸 USA (+1)", minDigits: 10, maxDigits: 10 },
  { code: "+34", shortLabel: "ES +34", fullLabel: "🇪🇸 España (+34)", minDigits: 9, maxDigits: 9 },
  { code: "+57", shortLabel: "CO +57", fullLabel: "🇨🇴 Colombia (+57)", minDigits: 10, maxDigits: 10 },
  { code: "+58", shortLabel: "VE +58", fullLabel: "🇻🇪 Venezuela (+58)", minDigits: 10, maxDigits: 10 },
];

function defaultAppointmentDateTime() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T09:00`;
}

function splitDateTime(dateTimeLocal) {
  if (!dateTimeLocal || !dateTimeLocal.includes("T")) {
    return { appointmentDate: "", appointmentTime: "09:00" };
  }
  const [appointmentDate, appointmentTime] = dateTimeLocal.split("T");
  return { appointmentDate, appointmentTime: appointmentTime.slice(0, 5) };
}

export default function PatientForm({ onSuccess, dict }) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    patientName: "",
    countryCode: "+297",
    localPhone: "",
    language: "es",
    treatmentType: "",
    appointmentDateTime: defaultAppointmentDateTime(),
    notifyValue: "1",
    notifyUnit: "appointment",
  });

  const isMinuteTest = form.notifyUnit === "minutes";

  const selectedCountry = useMemo(
    () => COUNTRY_OPTIONS.find((c) => c.code === form.countryCode) || COUNTRY_OPTIONS[0],
    [form.countryCode],
  );

  const handlePatientSelect = useCallback((patient) => {
    if (patient._id) {
      // Paciente existente seleccionado — auto-rellenar
      const code = patient.phone.replace(/\d/g, "").trim();
      const local = patient.phone.replace(/\D/g, "").slice(-10);
      setForm((prev) => ({
        ...prev,
        patientName: patient.name,
        countryCode: code || prev.countryCode,
        localPhone: local,
        language: patient.language || prev.language,
      }));
    } else {
      // Nuevo paciente — solo el nombre
      setForm((prev) => ({ ...prev, patientName: patient.name }));
    }
  }, []);

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

  function handleNotifyUnitChange(value) {
    setForm((prev) => ({
      ...prev,
      notifyUnit: value,
      notifyValue: value === "minutes" ? "1" : prev.notifyValue,
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);

    const digits = form.localPhone.replace(/\D/g, "");
    if (digits.length < selectedCountry.minDigits || digits.length > selectedCountry.maxDigits) {
      toast.error(tHelper(dict, "errorInvalidPhone", { country: selectedCountry.fullLabel }));
      setSaving(false);
      return;
    }

    const { appointmentDate, appointmentTime } = splitDateTime(form.appointmentDateTime);

    const payload = {
      patientName: form.patientName,
      patientPhone: `${form.countryCode}${digits}`,
      language: form.language,
      treatmentType: form.treatmentType,
      appointmentDate,
      appointmentTime,
      appointmentDateTime: form.appointmentDateTime,
      notifyValue: form.notifyValue,
      notifyUnit: form.notifyUnit,
    };

    try {
      const res = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || tHelper(dict, "errorSave"));

      toast.success(
        isMinuteTest
          ? tHelper(dict, "savedMinutes", { min: form.notifyValue })
          : tHelper(dict, "savedSuccess"),
      );
      setForm({
        patientName: "",
        countryCode: "+297",
        localPhone: "",
        language: "es",
        treatmentType: "",
        appointmentDateTime: defaultAppointmentDateTime(),
        notifyValue: "1",
        notifyUnit: "appointment",
      });
      setShowForm(false);
      onSuccess?.();
    } catch (error) {
      toast.error(error.message || tHelper(dict, "errorSave"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="glass-card mb-4 sm:mb-8 overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--aruba-turquoise)]/10">
              <Plus className="w-5 h-5 text-[var(--aruba-turquoise)]" />
            </div>
            <div>
              <CardTitle className="text-base sm:text-lg">{tHelper(dict, "dashboardRegister")}</CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {tHelper(dict, "dashboardSubtitle")}
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => setShowForm(!showForm)} className="gap-2 text-xs sm:text-sm">
            {showForm ? tHelper(dict, "hideForm") : tHelper(dict, "showForm")}
            <ChevronDown className={`w-4 h-4 transition-transform ${showForm ? "rotate-180" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      {showForm && (
        <CardContent className="pt-0 animate-slide-up">
          <form onSubmit={handleSave} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Combobox de búsqueda de pacientes */}
            <div className="sm:col-span-2 lg:col-span-3 space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm font-medium">{tHelper(dict, "patientName")}</Label>
              <PatientCombobox
                value={form.patientName}
                onChange={handlePatientSelect}
                dict={dict}
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm font-medium">{tHelper(dict, "patientPhone")}</Label>
              <div className="flex gap-2">
                <Select value={form.countryCode} onValueChange={handleCountryChange}>
                  <SelectTrigger className="w-[110px] sm:w-[140px] h-10 sm:h-11">
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
                  placeholder={tHelper(dict, "phoneDigits", { min: selectedCountry.minDigits, max: selectedCountry.maxDigits })}
                  value={form.localPhone}
                  onChange={(e) => handleLocalPhoneChange(e.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={selectedCountry.maxDigits}
                  required
                  className="input-aruba flex-1 h-10 sm:h-11"
                />
              </div>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm font-medium">{tHelper(dict, "language")}</Label>
              <Select value={form.language} onValueChange={(value) => setForm((p) => ({ ...p, language: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">{tHelper(dict, "spanish")}</SelectItem>
                  <SelectItem value="en">{tHelper(dict, "english")}</SelectItem>
                  <SelectItem value="pap">{tHelper(dict, "papiamento")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm font-medium">{tHelper(dict, "treatment")}</Label>
              <Input
                placeholder={tHelper(dict, "treatmentPlaceholder")}
                value={form.treatmentType}
                onChange={(e) => setForm((p) => ({ ...p, treatmentType: e.target.value }))}
                required
                className="input-aruba h-10 sm:h-11"
              />
            </div>

            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm font-medium">{tHelper(dict, "reminderType")}</Label>
              <Select value={form.notifyUnit} onValueChange={handleNotifyUnitChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appointment">{tHelper(dict, "reminderAppointment")}</SelectItem>
                  <SelectItem value="minutes">{tHelper(dict, "reminderMinutes")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isMinuteTest ? (
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm font-medium">{tHelper(dict, "reminderSendIn")}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={form.notifyValue}
                    onChange={(e) => setForm((p) => ({ ...p, notifyValue: e.target.value }))}
                    required
                    className="input-aruba w-20 h-10 sm:h-11"
                  />
                  <span className="text-xs sm:text-sm text-muted-foreground">{tHelper(dict, "reminderMinutesAfter")}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 sm:space-y-2 sm:col-span-2">
                <Label className="text-xs sm:text-sm font-medium">{tHelper(dict, "appointmentDateTime")}</Label>
                <Input
                  type="datetime-local"
                  value={form.appointmentDateTime}
                  onChange={(e) => setForm((p) => ({ ...p, appointmentDateTime: e.target.value }))}
                  required
                  className="input-aruba max-w-xs sm:max-w-md h-10 sm:h-11"
                />
                <p className="text-xs text-muted-foreground">
                  {tHelper(dict, "reminderInfo")}
                </p>
              </div>
            )}

            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <Button type="submit" disabled={saving} className="btn-aruba gap-2 min-w-[140px] sm:min-w-[160px] h-10 sm:h-11 text-sm">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {tHelper(dict, "saving")}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    {tHelper(dict, "save")}
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
