/**
 * Tests unitarios para schemas de validación Zod
 */
import { describe, it, expect } from "vitest";

const validation = await import("@/lib/validation");

describe("patientSchema", () => {
  it("acepta datos válidos", () => {
    const result = validation.patientSchema.safeParse({
      patientName: "María García",
      patientPhone: "+2975881234",
      language: "es",
      treatmentType: "Limpieza dental",
      notifyUnit: "appointment",
      notifyValue: 1,
    });
    expect(result.success).toBe(true);
  });

  it("rechaza nombre vacío", () => {
    const result = validation.patientSchema.safeParse({
      patientName: "",
      patientPhone: "+2975881234",
      treatmentType: "Limpieza",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza teléfono sin código de país", () => {
    const result = validation.patientSchema.safeParse({
      patientName: "María",
      patientPhone: "5881234",
      treatmentType: "Limpieza",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza teléfono con formato inválido", () => {
    const result = validation.patientSchema.safeParse({
      patientName: "María",
      patientPhone: "abc123",
      treatmentType: "Limpieza",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza idioma inválido", () => {
    const result = validation.patientSchema.safeParse({
      patientName: "María",
      patientPhone: "+2975881234",
      language: "fr",
      treatmentType: "Limpieza",
    });
    expect(result.success).toBe(false);
  });

  it("usa valores por defecto", () => {
    const result = validation.patientSchema.safeParse({
      patientName: "María",
      patientPhone: "+2975881234",
      treatmentType: "Limpieza",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.language).toBe("es");
      expect(result.data.notifyUnit).toBe("appointment");
    }
  });
});

describe("loginSchema", () => {
  it("acepta credenciales válidas", () => {
    const result = validation.loginSchema.safeParse({
      username: "admin",
      password: "secret",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza usuario vacío", () => {
    const result = validation.loginSchema.safeParse({
      username: "",
      password: "secret",
    });
    expect(result.success).toBe(false);
  });
});

describe("webhookSchema", () => {
  it("acepta payload válido", () => {
    const result = validation.webhookSchema.safeParse({
      from: "5881234@c.us",
      body: "SI",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza from vacío", () => {
    const result = validation.webhookSchema.safeParse({
      from: "",
      body: "SI",
    });
    expect(result.success).toBe(false);
  });
});
