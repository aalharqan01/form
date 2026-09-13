'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { useI18n } from '../i18n';
import ThemeControl from '../theme-control';
import LanguageControl from '../language-control';

/** Appearance and language behind one quiet button, on every screen size. */
export default function PreferencesMenu() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div className="co-prefs" ref={root}>
      <button
        type="button"
        className="co-prefs-button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={t('prefs.title')}
        onClick={() => setOpen((v) => !v)}
      >
        <Settings2 size={19} strokeWidth={1.5} />
        <span>{t('prefs.title')}</span>
      </button>
      <div
        id={id}
        className="co-prefs-panel"
        data-open={open ? '' : undefined}
        hidden={!open}
      >
        <ThemeControl />
        <LanguageControl />
      </div>
    </div>
  );
}
