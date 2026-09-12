'use client';
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
  const [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function upload(file?: File) {
    if (!file) return;
    if (
      !['video/mp4', 'video/webm'].includes(file.type) ||
      file.size > 25 * 1024 * 1024 ||
      file.size < 12
    ) {
      setError('Choose an MP4 or WebM video up to 25 MB.');
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
          throw new Error(data.error || 'Upload failed. Please retry.');
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
            ? 'Uploading video…'
            : value
              ? 'Replace demonstration'
              : 'Upload demonstration'}
          <small>MP4 or WebM · up to 25 MB</small>
        </span>
        <input
          type="file"
          accept="video/mp4,video/webm"
          disabled={busy}
          aria-label={`Upload video for ${name}`}
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
          <summary>Or use an existing video URL</summary>
          <Input
            aria-label={`Video URL for ${name}`}
            value={value}
            maxLength={1000}
            onChange={(e) => onChange(e.target.value)}
            placeholder="YouTube, Vimeo or direct video URL"
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
            Remove from exercise
          </Button>
        </>
      )}
    </div>
  );
}
