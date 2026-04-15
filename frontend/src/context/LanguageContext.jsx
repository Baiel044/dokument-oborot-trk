import { createContext, useContext, useMemo, useState } from "react";
import { STORAGE_LANGUAGE_KEY, getStoredLanguage, translate } from "../utils/localization";

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => getStoredLanguage());

  function setLanguage(nextLanguage) {
    const value = nextLanguage === "ru" ? "ru" : "ky";
    localStorage.setItem(STORAGE_LANGUAGE_KEY, value);
    setLanguageState(value);
  }

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (path, fallback) => translate(language, path, fallback),
    }),
    [language]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  return useContext(LanguageContext);
}
