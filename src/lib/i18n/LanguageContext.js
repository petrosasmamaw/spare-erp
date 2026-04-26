"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { translations } from "@/lib/i18n/translations";

const LanguageContext = createContext(null);

function getValueByPath(obj, path) {
  return path.split(".").reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

function interpolate(text, vars = {}) {
  if (typeof text !== "string") {
    return text;
  }

  return text.replace(/\{(\w+)\}/g, (_match, key) => {
    const value = vars[key];
    return value === undefined || value === null ? "" : String(value);
  });
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window === "undefined") {
      return "en";
    }

    const stored = window.localStorage.getItem("spare-erp-lang");
    return stored === "en" || stored === "amh" ? stored : "en";
  });

  useEffect(() => {
    window.localStorage.setItem("spare-erp-lang", language);
    document.documentElement.lang = language === "amh" ? "am" : "en";
  }, [language]);

  const value = useMemo(() => {
    const t = (key, vars) => {
      const active = translations[language] || translations.en;
      const fallback = translations.en;
      const result = getValueByPath(active, key) ?? getValueByPath(fallback, key) ?? key;
      return interpolate(result, vars);
    };

    return {
      language,
      setLanguage,
      t,
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }

  return context;
}
