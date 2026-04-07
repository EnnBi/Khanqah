import React, { createContext, useContext, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import '../lib/i18n';

interface I18nContextValue {
  language: string;
  setLanguage: (lang: 'en' | 'ur') => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const setLanguage = useCallback(
    (lang: 'en' | 'ur') => {
      i18n.changeLanguage(lang);
    },
    [i18n],
  );

  return (
    <I18nContext.Provider value={{ language: i18n.language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
