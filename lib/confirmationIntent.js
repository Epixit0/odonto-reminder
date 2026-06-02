/**
 * Detecta confirmación o cancelación en respuestas de WhatsApp.
 * Soporta español (es), inglés (en) y papiamento (pap).
 * Se evalúan todos los idiomas: el paciente puede responder en otro idioma al del registro.
 */

const CANCEL_PHRASES = [
  // — español —
  "no puedo",
  "no voy",
  "no asisto",
  "no asistiré",
  "no asistire",
  "no podré",
  "no podre",
  "no gracias",
  "no, gracias",
  "mejor no",
  "prefiero no",
  "tengo que cancelar",
  "quiero cancelar",
  "necesito cancelar",
  "otro día",
  "otro dia",
  "otra fecha",
  "reagendar",
  "cancelar cita",
  "cancelo la cita",
  "no confirmo",
  "no confirmar",
  // — inglés —
  "no thanks",
  "no thank you",
  "can't make it",
  "cannot make it",
  "cant make it",
  "won't make it",
  "will not make it",
  "can not make it",
  "unable to attend",
  "cannot attend",
  "can't attend",
  "need to cancel",
  "have to cancel",
  "want to cancel",
  "would like to cancel",
  "please cancel",
  "cancel appointment",
  "not coming",
  "won't come",
  "will not come",
  "can't come",
  "cannot come",
  "another day",
  "reschedule",
  // — papiamento —
  "no danki",
  "no, danki",
  "no porfabor",
  "no por fabor",
  "no ta pudi",
  "no por pudi",
  "mi no ta pudi",
  "no ta bini",
  "mi no ta bini",
  "no ta asisti",
  "mi no ta asisti",
  "mester cancela",
  "ke cancela",
  "kansela",
  "cancela e cita",
  "otro dia",
  "otro dia mas",
];

const CONFIRM_PHRASES = [
  // — español —
  "por supuesto",
  "claro que si",
  "claro que sí",
  "si por favor",
  "sí por favor",
  "si, por favor",
  "sí, por favor",
  "si gracias",
  "sí gracias",
  "si, gracias",
  "sí, gracias",
  "si dale",
  "sí dale",
  "si claro",
  "sí claro",
  "dale si",
  "dale sí",
  "ok si",
  "ok sí",
  "confirmo la cita",
  "confirmo cita",
  "confirmado",
  "asistiré",
  "asistire",
  "ahí estaré",
  "ahi estare",
  "cuenta conmigo",
  "nos vemos",
  // — inglés —
  "yes please",
  "yes thanks",
  "yes thank you",
  "yeah sure",
  "sure thing",
  "of course",
  "will be there",
  "ill be there",
  "i'll be there",
  "i will be there",
  "see you then",
  "count me in",
  "absolutely",
  "definitely",
  "please yes",
  "thanks yes",
  "thank you yes",
  "ok yes",
  "okay yes",
  "confirmed",
  "i confirm",
  // — papiamento —
  "si porfabor",
  "si por fabor",
  "si danki",
  "si, danki",
  "danki si",
  "porfabor si",
  "por fabor si",
  "yo ta bini",
  "mi ta bini",
  "nos ta bini",
  "ta bon",
  "hopi bon",
  "confirmá",
  "confirma",
  "confirmá e cita",
  "mi ta asisti",
  "nos ta asisti",
  "te aworo",
  "te veo",
];

const AMBIGUOUS_PHRASES = [
  // es
  "no se",
  "no sé",
  "no lo se",
  "no lo sé",
  "tal vez",
  "quizás",
  "quiza",
  "no estoy seguro",
  "no estoy segura",
  // en
  "maybe",
  "not sure",
  "i don't know",
  "i dont know",
  "let me check",
  "i'll let you know",
  "ill let you know",
  // pap
  "talvez",
  "quizas",
  "mi no sa",
  "no ta sigur",
  "no ta segur",
];

const CONFIRM_START =
  /^(s[ií]|yes|yep|yeah|yup|ok|okay|sure|dale|claro|perfecto|confirmo|confirmado|confirmed|absolutely|definitely|bon|hopi|✅)\b/i;

const CANCEL_START = /^(no|nop|nope|nah|❌)\b/i;

const CONFIRM_WORDS = new Set([
  // es + shared
  "si",
  "sí",
  "dale",
  "claro",
  "perfecto",
  "bien",
  "correcto",
  "confirmo",
  "confirmado",
  "asistiré",
  "asistire",
  "voy",
  "simon",
  "simón",
  "gracias",
  "porfavor",
  "por",
  "favor",
  // en
  "yes",
  "yep",
  "yeah",
  "yup",
  "ok",
  "okay",
  "sure",
  "thanks",
  "thank",
  "confirmed",
  "absolutely",
  "definitely",
  // pap
  "danki",
  "porfabor",
  "fabor",
  "bon",
  "hopi",
  "bini",
  "asisti",
  "confirmá",
  "confirma",
]);

const CANCEL_WORDS = new Set([
  "no",
  "nop",
  "nope",
  "nah",
  "cancelo",
  "cancelado",
  "cancelar",
  "cancel",
  "cancelled",
  "canceled",
  "anular",
  "anulo",
  "imposible",
  "kansela",
  "cancela",
  "pudi",
]);

const CONFIRM_FILLERS = new Set([
  "por",
  "favor",
  "fabor",
  "porfabor",
  "gracias",
  "danki",
  "muchas",
  "mil",
  "thanks",
  "thank",
  "you",
  "please",
  "dale",
  "ok",
  "okay",
  "claro",
  "bon",
  "hopi",
  "mucho",
  "muy",
]);

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s✅❌]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function includesPhrase(text, phrases) {
  return phrases.some((p) => text.includes(p));
}

function firstMeaningfulWord(words) {
  return words.find((w) => w.length > 0) ?? "";
}

/**
 * @param {string | null | undefined} text
 * @returns {"confirmed" | "cancelled" | null}
 */
export function parseConfirmationIntent(text) {
  if (!text || typeof text !== "string") return null;

  const normalized = normalizeText(text);
  if (!normalized) return null;

  if (includesPhrase(normalized, AMBIGUOUS_PHRASES)) return null;

  if (normalized === "✅" || normalized.startsWith("✅")) return "confirmed";
  if (normalized === "❌" || normalized.startsWith("❌")) return "cancelled";

  if (includesPhrase(normalized, CANCEL_PHRASES)) return "cancelled";
  if (includesPhrase(normalized, CONFIRM_PHRASES)) return "confirmed";

  const words = normalized.split(/\s+/).filter(Boolean);

  if (CANCEL_START.test(normalized)) {
    const rest = words.slice(1);
    if (rest.length === 0) return "cancelled";
    if (
      rest.every(
        (w) =>
          CANCEL_WORDS.has(w) ||
          CONFIRM_FILLERS.has(w) ||
          w === "gracias" ||
          w === "danki",
      )
    ) {
      return "cancelled";
    }
    return "cancelled";
  }

  if (CONFIRM_START.test(normalized)) {
    const rest = words.slice(1);
    if (rest.length === 0) return "confirmed";
    if (rest.every((w) => CONFIRM_WORDS.has(w) || CONFIRM_FILLERS.has(w))) {
      return "confirmed";
    }
    if (
      includesPhrase(normalized, [
        "por favor",
        "porfabor",
        "por fabor",
        "gracias",
        "danki",
        "thanks",
        "please",
        "dale",
        "claro",
      ])
    ) {
      return "confirmed";
    }
    return "confirmed";
  }

  if (
    /^(por favor|porfabor|por fabor|please|dale|ok|okay|claro|thanks|danki)\s+(si|sí|yes|yep|yeah)\b/.test(
      normalized,
    )
  ) {
    return "confirmed";
  }

  const first = firstMeaningfulWord(words);
  if (first === "no" || CANCEL_WORDS.has(first)) {
    if (words.length === 1) return "cancelled";
    if (
      (words.includes("gracias") || words.includes("danki") || words.includes("thanks")) &&
      !words.includes("si") &&
      !words.includes("sí") &&
      !words.includes("yes")
    ) {
      return "cancelled";
    }
    if (words.some((w) => CANCEL_WORDS.has(w) && w !== "no")) return "cancelled";
    if (first === "no") return "cancelled";
  }

  if (first === "si" || first === "sí" || first === "yes" || CONFIRM_WORDS.has(first)) {
    const rest = words.slice(1);
    if (rest.length === 0) return "confirmed";
    if (rest.some((w) => CANCEL_WORDS.has(w))) return "cancelled";
    if (rest.every((w) => CONFIRM_WORDS.has(w) || CONFIRM_FILLERS.has(w))) {
      return "confirmed";
    }
  }

  const hasCancel = words.some((w) => CANCEL_WORDS.has(w));
  const hasConfirm = words.some(
    (w) => CONFIRM_WORDS.has(w) && !["gracias", "danki", "thanks"].includes(w),
  );

  if (hasCancel && !hasConfirm) return "cancelled";
  if (hasConfirm && !hasCancel) return "confirmed";

  if (
    words.length <= 2 &&
    (words.includes("gracias") || words.includes("danki") || words.includes("thanks") || words.includes("dale"))
  ) {
    return null;
  }

  return null;
}

/** Mensaje automático cuando no se entiende la respuesta */
export function getUnrecognizedReplyMessage(language = "es") {
  const messages = {
    es: "🤖 *Mensaje automático*\n\nPara confirmar o cancelar su cita, responda por ejemplo:\n\n*SI*, *SI por favor*, *SI gracias*, *dale*\n*NO*, *NO gracias*, *no puedo*\n\nSi necesita ayuda, contacte a la clínica.",
    en: "🤖 *Automated message*\n\nTo confirm or cancel your appointment, reply for example:\n\n*YES*, *YES please*, *YES thanks*, *sure*\n*NO*, *NO thanks*, *can't make it*\n\nFor help, please contact the clinic.",
    pap: "🤖 *Mensahe automático*\n\nPa confirma of cancela bo cita, contesta por ejemplo:\n\n*SI*, *SI porfabor*, *SI danki*\n*NO*, *NO danki*, *no ta pudi*\n\nPa ayudo, contacta e clinica.",
  };
  return messages[language] ? messages[language] : messages.es;
}
