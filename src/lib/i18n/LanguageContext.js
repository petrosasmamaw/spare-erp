"use client";

import { useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setLanguage as setLanguageAction } from "@/lib/features/erpSlice";
import { translations } from "@/lib/i18n/translations";

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
  const dispatch = useDispatch();
  const language = useSelector((state) => state.erp.language);

  useEffect(() => {
    const stored = window.localStorage.getItem("spare-erp-lang");
    if (stored === "en" || stored === "amh") {
      dispatch(setLanguageAction(stored));
    }
  }, [dispatch]);

  useEffect(() => {
    window.localStorage.setItem("spare-erp-lang", language);
    document.documentElement.lang = language === "amh" ? "am" : "en";
  }, [language]);

  return children;
}

export function useLanguage() {
  const dispatch = useDispatch();
  const language = useSelector((state) => state.erp.language);

  const t = useMemo(() => {
    return (key, vars) => {
      const active = translations[language] || translations.en;
      const fallback = translations.en;
      const result = getValueByPath(active, key) ?? getValueByPath(fallback, key) ?? key;
      return interpolate(result, vars);
    };
  }, [language]);

  const setLanguage = (nextLanguage) => {
    const resolved =
      typeof nextLanguage === "function" ? nextLanguage(language) : nextLanguage;
    dispatch(setLanguageAction(resolved));
  };

  return {
    language,
    setLanguage,
    t,
  };
}
