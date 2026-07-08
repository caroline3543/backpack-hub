// ─── I18nContext.jsx ──────────────────────────────────────────────────────────
// Minimal i18n provider: language persisted to localStorage, RTL handled
// automatically (Arabic), and a t(key, vars) lookup with {placeholder}
// interpolation and dotted-path keys, e.g. t("sheet.saveGoal").

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import en from "./locales/en.js";
import ko from "./locales/ko.js";
import es from "./locales/es.js";
import ar from "./locales/ar.js";

const LOCALES = { en, ko, es, ar };
export const LANGUAGE_OPTIONS = [
  { code: "en", name: "English" },
  { code: "ko", name: "한국어" },
  { code: "es", name: "Español" },
  { code: "ar", name: "العربية" },
];

const LS_KEY = "backpack-hub-language";
const DEFAULT_LANG = "en";

function detectInitialLanguage() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved && LOCALES[saved]) return saved;
  } catch {}
  const nav = (navigator.language || "en").slice(0, 2);
  if (LOCALES[nav]) return nav;
  return DEFAULT_LANG;
}

function getPath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj);
}

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (_, key) => (vars[key] !== undefined ? vars[key] : `{${key}}`));
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [language, setLanguageState] = useState(detectInitialLanguage);

  const dict = LOCALES[language] || LOCALES[DEFAULT_LANG];
  const dir = dict.meta?.dir || "ltr";

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
  }, [language, dir]);

  const setLanguage = useCallback((code) => {
    if (!LOCALES[code]) return;
    setLanguageState(code);
    try { localStorage.setItem(LS_KEY, code); } catch {}
  }, []);

  const t = useCallback((key, vars) => {
    const val = getPath(dict, key);
    if (val === undefined) {
      const fallback = getPath(en, key);
      return fallback !== undefined ? interpolate(fallback, vars) : key;
    }
    return typeof val === "string" ? interpolate(val, vars) : val;
  }, [dict]);

  // Convenience: translate a predefined item id, category, or priority,
  // falling back to the raw value if no translation exists (e.g. custom items).
  const tItem     = useCallback((id, fallbackName) => getPath(dict, `items.${id}`) || fallbackName || id, [dict]);
  const tCategory = useCallback((category)         => getPath(dict, `categories.${category}`) || category, [dict]);
  const tPriority = useCallback((priority)         => getPath(dict, `priority.${priority}`) || priority, [dict]);

  const value = useMemo(() => ({
    language, setLanguage, dir, t, tItem, tCategory, tPriority,
    dateLocale: dict.meta?.dateLocale || "en-GB",
    options: LANGUAGE_OPTIONS,
  }), [language, setLanguage, dir, t, tItem, tCategory, tPriority, dict]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}
