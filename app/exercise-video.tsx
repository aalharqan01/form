'use client';
import { useContext, useState } from 'react';
import { exerciseVideo } from '@/lib/video';
import './exercise-video.css';
import { VideoSourcesContext } from './video-transport';
export default function ExerciseVideo({
  url,
  name,
}: {
  url: string;
  name: string;
}) {
  const uploadedSources = useContext(VideoSourcesContext);
  const source = uploadedSources[url]
    ? { kind: 'file', src: uploadedSources[url] }
    : exerciseVideo(url);
  const [failedUrl, setFailedUrl] = useState('');
  if (!source)
    return (
      <p className="exercise-video-hint">
        Use a YouTube, Vimeo or direct MP4/WebM video URL to play the
        demonstration here.
      </p>
    );
  return (
    <figure className="exercise-video">
      {source.kind === 'embed' ? (
        <iframe
          key={source.src}
          src={source.src}
          title={`${name} demonstration`}
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
          aria-label={`${name} demonstration`}
          onError={() => setFailedUrl(url)}
        />
      )}
      <figcaption>
        {failedUrl === url
          ? 'Video unavailable. Ask your coach to update the demonstration.'
          : `${name} · Demonstration`}
      </figcaption>
    </figure>
  );
}
