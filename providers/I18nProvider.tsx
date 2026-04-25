import React, { createContext, useContext, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../lib/i18n';
import { loadStoredLanguage } from '../lib/language-pref';

interface I18nContextValue {
  language: string;
  isRTL: boolean;
  setLanguage: (lang: 'en' | 'ur') => void;
  t: (key: string, options?: Record<string, unknown>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  language: 'en',
  isRTL: false,
  setLanguage: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();
  const [booted, setBooted] = useState(false);

  // Sync i18next's runtime language with persisted pref once on mount.
  // The actual layout direction (LTR/RTL) is set even earlier by
  // rtlBootstrap() in app/_layout.tsx, so by the time we run i18next
  // is just catching up to the same value.
  useEffect(() => {
    let cancelled = false;
    loadStoredLanguage().then((stored) => {
      if (cancelled) return;
      if (i18n.language !== stored) i18n.changeLanguage(stored);
      setBooted(true);
    });
    return () => { cancelled = true; };
  }, [i18n]);

  const setLanguage = useCallback(
    (lang: 'en' | 'ur') => {
      i18n.changeLanguage(lang);
    },
    [i18n],
  );

  const isRTL = i18n.language === 'ur';

  // Wait one tick for i18next to align with stored language before
  // exposing children. Otherwise the first frame may render English
  // even though the user picked Urdu.
  if (!booted) return null;

  return (
    <I18nContext.Provider value={{ language: i18n.language, isRTL, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
