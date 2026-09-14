'use client';
import { useI18n } from '@/app/i18n';

import { useState } from 'react';
import { exerciseVideo } from '@/lib/video';
import './exercise-video.css';
export default function ExerciseVideo({
  url,
  name,
}: {
  url: string;
  name: string;
}) {
  const { t } = useI18n();
  const source = exerciseVideo(url);
  const [failedUrl, setFailedUrl] = useState('');
  if (!source)
    return <p className="exercise-video-hint">{t('coachWeb.videoHint')}</p>;
  return (
    <figure className="exercise-video">
      {source.kind === 'embed' ? (
        <iframe
          key={source.src}
          src={source.src}
          title={t('coachWeb.demoFor', { name })}
          loading="lazy"
          allow="encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        /* Coaching demonstrations may be silent; captions are controlled by the supplied media. */
        /* oxlint-disable-next-line jsx-a11y/media-has-caption */
        <video
          key={source.src}
          src={source.src}
          controls
          playsInline
          preload="metadata"
          aria-label={t('coachWeb.demoFor', { name })}
          onError={() => setFailedUrl(url)}
        />
      )}
      <figcaption>
        {failedUrl === url
          ? t('coachWeb.videoUnavailable')
          : t('coachWeb.demoFor', { name })}
      </figcaption>
    </figure>
  );
}
