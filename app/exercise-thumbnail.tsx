import { Dumbbell } from 'lucide-react';
import imagePaths from '@/lib/exercise-images.json';
/* oxlint-disable nextjs/no-img-element */
export default function ExerciseThumbnail({ name }: { name: string }) {
  const source = (imagePaths as Record<string, string>)[name];
  return (
    <span
      className={`exercise-thumbnail ${source ? 'has-image' : ''}`}
      aria-hidden="true"
    >
      {source ? (
        <img
          src={source}
          alt=""
          width={56}
          height={56}
          loading="lazy"
          decoding="async"
        />
      ) : (
        <Dumbbell size={24} strokeWidth={1.4} />
      )}
    </span>
  );
}
export function ExerciseCredits() {
  return (
    <small className="exercise-credits">
      Illustrations:{' '}
      <a
        href="https://github.com/everkinetic/data"
        target="_blank"
        rel="noreferrer"
      >
        Everkinetic / Greg Priday
      </a>{' '}
      ·{' '}
      <a
        href="https://creativecommons.org/licenses/by-sa/4.0/"
        target="_blank"
        rel="noreferrer"
      >
        CC BY-SA 4.0
      </a>
    </small>
  );
}
