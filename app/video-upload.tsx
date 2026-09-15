'use client';
import { useI18n } from '@/app/i18n';

import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ExerciseVideo from './exercise-video';
export default function VideoUpload({
  memberId,
  name,
  value,
  onChange,
  onBusy,
}: {
  memberId: string;
  name: string;
  value: string;
  onChange: (url: string) => void;
  onBusy?: (busy: boolean) => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function upload(file?: File) {
    if (!file) return;
    if (
      !['video/mp4', 'video/webm'].includes(file.type) ||
      file.size > 25 * 1024 * 1024 ||
      file.size < 12
    ) {
      setError(t('coachWeb.videoTypeError'));
      return;
    }
    setBusy(true);
    onBusy?.(true);
    setError('');
    try {
      {
        const response = await fetch(
          '/api/videos?member=' + encodeURIComponent(memberId),
          {
            method: 'POST',
            headers: {
              'Content-Type': file.type,
              'X-Video-Size': String(file.size),
            },
            body: file,
          },
        );
        const data = (await response.json()) as { url: string; error?: string };
        if (!response.ok)
          throw new Error(data.error || t('coachWeb.uploadError'));
        onChange(data.url);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      onBusy?.(false);
    }
  }
  return (
    <div className="video-upload">
      <label className="video-upload-choice">
        <Upload size={19} />
        <span>
          {busy
            ? t('coachWeb.uploadingVideo')
            : value
              ? t('coachWeb.replaceDemo')
              : t('coachWeb.uploadDemo')}
          <small>{t('coachWeb.videoFormats')}</small>
        </span>
        <input
          type="file"
          accept="video/mp4,video/webm"
          disabled={busy}
          aria-label={t('coachWeb.uploadFor', { name })}
          onChange={(e) => {
            void upload(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
      {error && (
        <p role="alert" className="co-error">
          {error}
        </p>
      )}
      {!value.startsWith('/api/videos?') && (
        <details>
          <summary>{t('coachWeb.existingVideo')}</summary>
          <Input
            aria-label={t('coachWeb.videoFor', { name })}
            value={value}
            maxLength={1000}
            onChange={(e) => onChange(e.target.value)}
            placeholder={t('coachWeb.videoPlaceholder')}
          />
        </details>
      )}
      {value && (
        <>
          <ExerciseVideo url={value} name={name} />
          <Button
            type="button"
            className="text-button"
            disabled={busy}
            onClick={() => onChange('')}
          >
            <X size={14} />
            {t('coachWeb.removeVideo')}
          </Button>
        </>
      )}
    </div>
  );
}
