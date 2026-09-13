'use client';
import { useCallback, useEffect, useState } from 'react';
import {
  isRtl,
  resolveLocale,
  translate,
  type Key,
  type LanguagePreference,
  type Locale,
} from '@/lib/i18n';

const STORAGE_KEY = 'form-language';
const EVENT = 'form-language-change';
function readPreference(): LanguagePreference {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === 'en' || v === 'ar' ? v : 'system';
  } catch {
    return 'system';
  }
}
export function currentLocale(): Locale {
  return resolveLocale(
    readPreference(),
    typeof navigator === 'undefined' ? [] : navigator.languages,
  );
}
/** Applies lang/dir to the document and remembers the choice for next visit. */
export function applyLanguage(preference: LanguagePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
    document.cookie = `${STORAGE_KEY}=${preference}; path=/; max-age=31536000; samesite=lax`;
  } catch {
    // Storage may be unavailable; the choice still applies to this page.
  }
  const locale = currentLocale();
  document.documentElement.lang = locale;
  document.documentElement.dir = isRtl(locale) ? 'rtl' : 'ltr';
  window.dispatchEvent(new Event(EVENT));
}
/** Current locale plus a translator; re-renders when the choice changes. */
export function useI18n() {
  const [locale, setLocale] = useState<Locale>('en');
  const [preference, setPreferenceState] =
    useState<LanguagePreference>('system');
  useEffect(() => {
    const sync = () => {
      setPreferenceState(readPreference());
      setLocale(currentLocale());
    };
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  const t = useCallback(
    (key: Key, vars?: Record<string, string | number>) =>
      translate(locale, key, vars),
    [locale],
  );
  const setPreference = useCallback((value: LanguagePreference) => {
    applyLanguage(value);
  }, []);
  return { locale, rtl: isRtl(locale), preference, setPreference, t };
}
