import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { setMyanmarUiActive } from '../../utils/localeText';
import { loadSettings } from '../../utils/settingsStorage';
import { resolveUiLocale, t as translate } from '../../utils/uiCopy';

type UiLocale = 'en' | 'my' | 'id' | 'es' | 'pt-BR' | 'fr';

type UiCopyContextValue = {
  /** Resolved UI locale (never "auto"). */
  locale: UiLocale;
  /** Translate a catalog key for the active UI locale. */
  t: (key: string, vars?: Record<string, string | number>) => string;
  /** Update UI locale immediately (also call after saving chatLanguage). */
  setUiLocaleFromChatLanguage: (chatLanguage: string | undefined) => void;
  /** Reload locale from persisted settings. */
  refreshUiLocale: () => Promise<void>;
};

const UiCopyContext = createContext<UiCopyContextValue | null>(null);

/**
 * App chrome locale follows chatLanguage (Settings → Emo language).
 * Mira keeps an independent miraLanguage for replies/placeholders.
 */
export function UiCopyProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<UiLocale>('en');

  const refreshUiLocale = useCallback(async () => {
    const settings = await loadSettings();
    setLocale(resolveUiLocale(settings.chatLanguage));
  }, []);

  useEffect(() => {
    setMyanmarUiActive(locale === 'my');
  }, [locale]);

  useEffect(() => {
    void refreshUiLocale();
  }, [refreshUiLocale]);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      if (next === 'active') void refreshUiLocale();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [refreshUiLocale]);

  const setUiLocaleFromChatLanguage = useCallback((chatLanguage: string | undefined) => {
    const next = resolveUiLocale(chatLanguage);
    setMyanmarUiActive(next === 'my');
    setLocale(next);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, t, setUiLocaleFromChatLanguage, refreshUiLocale }),
    [locale, t, setUiLocaleFromChatLanguage, refreshUiLocale],
  );

  return <UiCopyContext.Provider value={value}>{children}</UiCopyContext.Provider>;
}

export function useUiCopy(): UiCopyContextValue {
  const ctx = useContext(UiCopyContext);
  if (!ctx) {
    // Safe fallback when a screen renders outside the provider (tests / early boot).
    return {
      locale: 'en',
      t: (key, vars) => translate('en', key, vars),
      setUiLocaleFromChatLanguage: () => {},
      refreshUiLocale: async () => {},
    };
  }
  return ctx;
}
