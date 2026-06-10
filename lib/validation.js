import { z } from "zod";

// ─── Paciente ───────────────────────────────────────────────
export const patientSchema = z.object({
  patientName: z
    .string()
    .min(1, "El nombre es requerido")
    .max(100, "El nombre no puede exceder 100 caracteres")
    .trim(),
  patientPhone: z
    .string()
    .min(7, "Teléfono inválido — mínimo 7 dígitos")
    .max(20, "Teléfono inválido")
    .regex(/^\+\d{7,15}$/, "Formato de teléfono inválido (ej: +2975881234)"),
  language: z.enum(["es", "en", "pap"]).default("es"),
  treatmentType: z
    .string()
    .min(1, "El tratamiento es requerido")
    .max(200, "Tratamiento demasiado largo")
    .trim(),
  appointmentDate: z.string().optional(),
  appointmentTime: z.string().optional(),
  appointmentDateTime: z.string().optional(),
  notifyValue: z.coerce.number().int().min(1).max(999).default(1),
  notifyUnit: z.enum(["minutes", "appointment", "days", "weeks", "months"]).default("appointment"),
});

// ─── Login ──────────────────────────────────────────────────
export const loginSchema = z.object({
  username: z.string().min(1, "Usuario requerido").max(50).trim(),
  password: z.string().min(1, "Contraseña requerida").max(100),
});

// ─── Webhook (entrada OpenWA) ──────────────────────────────
export const webhookSchema = z.object({
  from: z.string().min(1, "from es requerido").max(100),
  body: z.string().min(1, "body es requerido").max(500),
  // Ignoramos el resto de campos que pueda enviar OpenWA
});

// ─── Actualización de visita (PATCH) ────────────────────────
export const visitPatchSchema = z.object({
  treatmentType: z.string().max(200).trim().optional(),
  followUpDate: z.coerce.date().optional(),
  confirmationStatus: z.enum(["pending", "confirmed", "cancelled"]).optional(),
  patientResponse: z.string().max(500).trim().optional(),
  cost: z.coerce.number().min(0).optional(),
  paid: z.boolean().optional(),
  notes: z.string().max(2000).trim().optional(),
});

// ─── Válida número de teléfono sin código de país ──────────
export function validateLocalPhone(digits, countryCode) {
  const minDigits = 7;
  const maxDigits = 15;
  const clean = digits.replace(/\D/g, "");
  if (clean.length < minDigits || clean.length > maxDigits) {
    return `El número debe tener entre ${minDigits} y ${maxDigits} dígitos`;
  }
  return null;
}
