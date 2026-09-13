'use client';
import { useI18n } from './i18n';
import type { LanguagePreference } from '@/lib/i18n';

/** English / Arabic / device, next to the appearance control. */
export default function LanguageControl() {
  const { t, preference, setPreference } = useI18n();
  const options: [LanguagePreference, string][] = [
    ['en', t('prefs.english')],
    ['ar', t('prefs.arabic')],
    ['system', t('prefs.languageSystem')],
  ];
  return (
    <div className="theme-control language-control">
      <span>{t('coach.language')}</span>
      <div>
        {options.map(([value, label]) => (
          <button
            key={value}
            type="button"
            lang={value === 'ar' ? 'ar' : undefined}
            aria-pressed={preference === value}
            onClick={() => setPreference(value)}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
