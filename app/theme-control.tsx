'use client';
import { useState, useEffect } from 'react';
import { useI18n } from './i18n';
export default function ThemeControl() {
  const [theme, setTheme] = useState('system');
  const { t } = useI18n();
  useEffect(() => {
    const t = setTimeout(
      () => setTheme(localStorage.getItem('form-theme') || 'system'),
      0,
    );
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const t = localStorage.getItem('form-theme') || 'system';
      document.documentElement.dataset.theme =
        t === 'system' ? (mq.matches ? 'dark' : 'light') : t;
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return (
    <div className="theme-control">
      <span>{t('prefs.appearance')}</span>
      <div>
        {(['light', 'dark', 'system'] as const).map((value) => (
          <button
            key={value}
            aria-pressed={theme === value}
            onClick={() => {
              setTheme(value);
              localStorage.setItem('form-theme', value);
              document.documentElement.dataset.theme =
                value === 'system'
                  ? matchMedia('(prefers-color-scheme: dark)').matches
                    ? 'dark'
                    : 'light'
                  : value;
            }}
          >
            {t(
              value === 'light'
                ? 'prefs.light'
                : value === 'dark'
                  ? 'prefs.dark'
                  : 'prefs.system',
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
