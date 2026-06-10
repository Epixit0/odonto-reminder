/**
 * Tests unitarios para chatId (normalización de IDs de WhatsApp)
 */
import { describe, it, expect } from "vitest";

const chatId = await import("@/lib/chatId");

describe("normalizeChatId", () => {
  it("devuelve el mismo ID si ya está normalizado", () => {
    expect(chatId.normalizeChatId("5881234@c.us")).toBe("5881234@c.us");
  });

  it("agrega @c.us si no tiene sufijo", () => {
    expect(chatId.normalizeChatId("5881234")).toBe("5881234@c.us");
  });

  it("mantiene @s.whatsapp.net tal cual (no convierte)", () => {
    expect(chatId.normalizeChatId("5881234@s.whatsapp.net")).toBe("5881234@s.whatsapp.net");
  });

  it("devuelve null para null", () => {
    expect(chatId.normalizeChatId(null)).toBeNull();
  });

  it("devuelve null para undefined", () => {
    expect(chatId.normalizeChatId(undefined)).toBeNull();
  });
});

describe("phoneDigitsFromChatId", () => {
  it("extrae dígitos de un chatId normal", () => {
    expect(chatId.phoneDigitsFromChatId("5881234@c.us")).toBe("5881234");
  });

  it("extrae dígitos de un chatId con prefijo de país", () => {
    expect(chatId.phoneDigitsFromChatId("2975881234@c.us")).toBe("2975881234");
  });

  it("devuelve string vacío si no hay dígitos", () => {
    expect(chatId.phoneDigitsFromChatId("@c.us")).toBe("");
  });
});

describe("phoneTailDigits", () => {
  it("obtiene últimos 4 dígitos", () => {
    expect(chatId.phoneTailDigits("2975881234", 4)).toBe("1234");
  });

  it("obtiene últimos 7 dígitos", () => {
    expect(chatId.phoneTailDigits("2975881234", 7)).toBe("5881234");
  });

  it("devuelve el número completo si es más corto que tail", () => {
    expect(chatId.phoneTailDigits("1234", 10)).toBe("1234");
  });
});
