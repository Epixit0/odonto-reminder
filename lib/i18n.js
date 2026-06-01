import es from "@/locales/es.json";
import en from "@/locales/en.json";
import pap from "@/locales/pap.json";

const dictionaries = { es, en, pap };

export function getDictionary(lang = "es") {
  return dictionaries[lang] || dictionaries.es;
}
