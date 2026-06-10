import es from "@/locales/es.json";
import en from "@/locales/en.json";
import pap from "@/locales/pap.json";

const dictionaries = { es, en, pap };

/**
 * Obtiene el diccionario completo para un idioma.
 */
export function getDictionary(lang = "es") {
  return dictionaries[lang] || dictionaries.es;
}

/**
 * Helper de traducción con fallback e interpolación de variables.
 * 
 * @param {object} dict - El diccionario (getDictionary result)
 * @param {string} key - La clave a traducir (e.g. "welcomeBack")
 * @param {object} vars - Opcional: variables a interpolar { name: "Juan", total: 5 }
 * @param {string} fallback - Opcional: texto por defecto si la clave no existe
 * @returns {string}
 * 
 * @example
 * t(dict, "welcomeBack", { name: "Juan" })
 * // -> "Bienvenido, Juan"
 */
export function t(dict, key, vars = {}, fallback = key) {
  const template = dict?.[key];
  if (!template) return fallback;

  if (typeof template !== "string") return fallback;

  if (Object.keys(vars).length === 0) return template;

  return template.replace(/\{(\w+)\}/g, (_, varName) => {
    return vars[varName] !== undefined ? String(vars[varName]) : `{${varName}}`;
  });
}
