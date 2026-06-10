/**
 * Tests unitarios para parseConfirmationIntent
 * El sistema de detección de intenciones de WhatsApp es crítico para el negocio.
 */
import { describe, it, expect, vi } from "vitest";

// Mock de dependencias
vi.mock("@/lib/reminders", () => ({
  CLINIC_NAME: "Dent Q Clinic Test",
}));

vi.mock("@/lib/i18n", () => ({
  getDictionary: () => ({}),
  t: (d, k) => k,
}));

// Importar el módulo real (después de mocks)
const confirmationIntent = await import("@/lib/confirmationIntent");

describe("parseConfirmationIntent", () => {
  it('detecta "si" como confirmed', () => {
    expect(confirmationIntent.parseConfirmationIntent("si")).toBe("confirmed");
  });

  it('detecta "sí" como confirmed', () => {
    expect(confirmationIntent.parseConfirmationIntent("sí")).toBe("confirmed");
  });

  it('detecta "yes" como confirmed', () => {
    expect(confirmationIntent.parseConfirmationIntent("yes")).toBe("confirmed");
  });

  it('detecta "no" como cancelled', () => {
    expect(confirmationIntent.parseConfirmationIntent("no")).toBe("cancelled");
  });

  it('detecta "no gracias" como cancelled', () => {
    expect(confirmationIntent.parseConfirmationIntent("no gracias")).toBe("cancelled");
  });

  it('retorna null para "tal vez"', () => {
    expect(confirmationIntent.parseConfirmationIntent("tal vez")).toBeNull();
  });

  it("retorna null para undefined", () => {
    expect(confirmationIntent.parseConfirmationIntent(undefined)).toBeNull();
  });

  it('detecta papiamento "si danki" como confirmed', () => {
    expect(confirmationIntent.parseConfirmationIntent("si danki")).toBe("confirmed");
  });

  it("detecta emoji ✅ como confirmed", () => {
    expect(confirmationIntent.parseConfirmationIntent("✅")).toBe("confirmed");
  });

  it('retorna null para texto ambiguo como "maybe"', () => {
    expect(confirmationIntent.parseConfirmationIntent("maybe")).toBeNull();
  });
});

describe("getUnrecognizedReplyMessage", () => {
  it("retorna mensaje en español por defecto", () => {
    const msg = confirmationIntent.getUnrecognizedReplyMessage("es");
    expect(msg).toBeTruthy();
    expect(typeof msg).toBe("string");
  });

  it("retorna mensaje en inglés", () => {
    const msg = confirmationIntent.getUnrecognizedReplyMessage("en");
    expect(msg).toBeTruthy();
    expect(typeof msg).toBe("string");
  });

  it("retorna mensaje en papiamento", () => {
    const msg = confirmationIntent.getUnrecognizedReplyMessage("pap");
    expect(msg).toBeTruthy();
    expect(typeof msg).toBe("string");
  });
});
