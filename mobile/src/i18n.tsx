import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { I18nManager, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isRtl,
  resolveLocale,
  translate,
  type Key,
  type LanguagePreference,
  type Locale,
} from '../../lib/i18n';
import { markArabic } from './theme';

const LANGUAGE_KEY = 'form-language';
/** How long the interface fades out before the language changes. */
export const SWITCH_OUT_MS = 150;
function systemTags(): string[] {
  try {
    if (typeof navigator !== 'undefined' && navigator.languages?.length)
      return [...navigator.languages];
    return [Intl.DateTimeFormat().resolvedOptions().locale];
  } catch {
    return [];
  }
}
type Vars = Record<string, string | number>;
/** The translate function handed out by useI18n, for helpers outside components. */
export type Translate = (key: Key, vars?: Vars) => string;
const Context = createContext<{
  locale: Locale;
  rtl: boolean;
  preference: LanguagePreference;
  setPreference: (value: LanguagePreference) => void;
  /** True for the short beat between choosing a language and the text changing. */
  switching: boolean;
  t: Translate;
}>({
  locale: 'en',
  rtl: false,
  preference: 'system',
  setPreference: () => {},
  switching: false,
  t: (key, vars) => translate('en', key, vars),
});

/** Holds the language choice and applies the writing direction. */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] =
    useState<LanguagePreference>('system');
  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(LANGUAGE_KEY)
      .then((saved) => {
        if (alive && (saved === 'en' || saved === 'ar' || saved === 'system'))
          setPreferenceState(saved);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const locale = resolveLocale(preference, systemTags());
  const rtl = isRtl(locale);
  markArabic(locale === 'ar');
  // start/end styles resolve against I18nManager on every platform, so it is
  // set before the tree renders. Native layouts flip on the next launch; the
  // web flips immediately once the document direction follows.
  if (I18nManager.isRTL !== rtl) {
    I18nManager.allowRTL(rtl);
    I18nManager.forceRTL(rtl);
  }
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.dir = rtl ? 'rtl' : 'ltr';
    }
  }, [locale, rtl]);
  const [switching, setSwitching] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const setPreference = useCallback(
    (value: LanguagePreference) => {
      void AsyncStorage.setItem(LANGUAGE_KEY, value).catch(() => {});
      const next = resolveLocale(value, systemTags());
      if (next === locale) {
        setPreferenceState(value);
        return;
      }
      // Let the old language fade before the new one settles in.
      setSwitching(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        setPreferenceState(value);
        setSwitching(false);
      }, SWITCH_OUT_MS);
    },
    [locale],
  );
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const value = useMemo(
    () => ({
      locale,
      rtl,
      preference,
      setPreference,
      switching,
      t: (key: Key, vars?: Vars) => translate(locale, key, vars),
    }),
    [locale, rtl, preference, setPreference, switching],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useI18n() {
  return useContext(Context);
}
