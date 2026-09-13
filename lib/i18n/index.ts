import { en, type Key } from './en.ts';
import { ar } from './ar.ts';

export type Locale = 'en' | 'ar';
/** What the person chose; `system` follows the device or browser. */
export type LanguagePreference = 'system' | Locale;
export const LOCALES: Locale[] = ['en', 'ar'];
export const RTL_LOCALES: Locale[] = ['ar'];
const dictionaries: Record<Locale, Record<Key, string>> = { en, ar };

export const isRtl = (locale: Locale) => RTL_LOCALES.includes(locale);
/** Picks the locale for a preference, given the system's language tags. */
export function resolveLocale(
  preference: LanguagePreference,
  systemTags: readonly string[] = [],
): Locale {
  if (preference !== 'system') return preference;
  for (const tag of systemTags) {
    const base = tag.toLowerCase().split(/[-_]/)[0];
    if (LOCALES.includes(base as Locale)) return base as Locale;
  }
  return 'en';
}
/** Looks a key up, filling {placeholders}; missing Arabic falls back to English. */
export function translate(
  locale: Locale,
  key: Key,
  vars: Record<string, string | number> = {},
) {
  const text = dictionaries[locale][key] ?? en[key];
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}
export type { Key };
