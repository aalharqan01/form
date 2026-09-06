'use client';
import { useState, useEffect } from 'react';
export default function ThemeControl() {
  const [theme, setTheme] = useState('system');
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
      <span>Appearance</span>
      <div>
        {['light', 'dark', 'system'].map((t) => (
          <button
            key={t}
            aria-pressed={theme === t}
            onClick={() => {
              setTheme(t);
              localStorage.setItem('form-theme', t);
              document.documentElement.dataset.theme =
                t === 'system'
                  ? matchMedia('(prefers-color-scheme: dark)').matches
                    ? 'dark'
                    : 'light'
                  : t;
            }}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
}
