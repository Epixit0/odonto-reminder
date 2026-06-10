"use client";

import { useMemo } from "react";
import { getDictionary, t as tHelper } from "@/lib/i18n";

/**
 * Hook de traducción para componentes client.
 * @param {string} lang - Código de idioma ("es", "en", "pap")
 * @returns {{ t: function, lang: string }}
 *
 * @example
 * const { t } = useTranslation("es");
 * t("welcomeBack", { name: "Juan" }) // "Bienvenido, Juan"
 */
export function useTranslation(lang = "es") {
  const dict = useMemo(() => getDictionary(lang), [lang]);

  const t = useMemo(
    () => (key, vars = {}, fallback) => tHelper(dict, key, vars, fallback),
    [dict],
  );

  return { t, lang };
}
