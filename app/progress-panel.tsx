'use client';
import { useState } from 'react';
import { Trophy, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  type FitnessData,
  exerciseHistory,
  dateLabel,
  displayWeight,
} from '@/lib/fitness';
// SVG data charts need an image role for assistive technology.
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
export default function ProgressPanel({ data }: { data: FitnessData }) {
  const [selected, setSelected] = useState<string | null>(null),
    [metric, setMetric] = useState<'kg' | 'volume' | 'reps'>('kg');
  const names = [
    ...new Set(data.workouts.flatMap((w) => w.exercises.map((e) => e.name))),
  ].sort();
  const points = selected ? exerciseHistory(data.workouts, selected) : [];
  const unit =
    data.workouts
      .flatMap((w) => w.exercises)
      .filter((e) => e.name === selected)
      .at(-1)?.unit ?? 'kg';
  const value = (n: number) => (metric === 'reps' ? n : displayWeight(n, unit));
  const max = Math.max(1, ...points.map((p) => value(p[metric]))),
    min = Math.max(0, Math.min(...points.map((p) => value(p[metric]))) * 0.9);
  const x = (i: number) =>
      points.length < 2 ? 240 : 35 + (i / (points.length - 1)) * 440,
    y = (v: number) => 175 - ((value(v) - min) / (max - min || 1)) * 145;
  return (
    <>
      <div className="section-title">
        <h2>Exercise progress</h2>
        <span className="small-muted">Working sets only</span>
      </div>
      {!names.length ? (
        <p className="empty-line">
          Complete a workout to see exercise trends and personal records.
        </p>
      ) : (
        <div className="progress-list">
          {names.map((n) => {
            const p = exerciseHistory(data.workouts, n),
              last = p.at(-1);
            return (
              <button
                className="progress-row"
                key={n}
                onClick={() => {
                  setSelected(n);
                  setMetric('kg');
                }}
              >
                <div>
                  <strong>{n}</strong>
                  <small>{p.length} sessions</small>
                </div>
                {last?.record && <Trophy size={17} />}
                <ChevronRight size={18} />
              </button>
            );
          })}
        </div>
      )}
      <Dialog
        open={selected !== null}
        onOpenChange={(v) => {
          if (!v) setSelected(null);
        }}
      >
        <DialogContent className="form-dialog progress-dialog">
          <DialogTitle>{selected}</DialogTitle>
          <DialogDescription>
            Best working-set load, reps at that load, and total working-set
            volume.
          </DialogDescription>
          <div className="range-switch">
            {[
              ['kg', 'Weight'],
              ['reps', 'Reps'],
              ['volume', 'Volume'],
            ].map(([key, label]) => (
              <button
                key={key}
                aria-pressed={metric === key}
                onClick={() => setMetric(key as typeof metric)}
              >
                {label}
              </button>
            ))}
          </div>
          <svg
            viewBox="0 0 510 215"
            role="img"
            aria-label={`${metric} progress across ${points.length} workouts`}
          >
            <line x1="35" x2="480" y1="178" y2="178" stroke="var(--line)" />
            <path
              d={points
                .map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p[metric])}`)
                .join(' ')}
              fill="none"
              stroke="var(--green)"
              strokeWidth="3"
            />
            {points.map((p, i) => (
              <circle
                key={p.id}
                cx={x(i)}
                cy={y(p[metric])}
                r="4"
                fill="var(--green)"
              />
            ))}
            <text x="35" y="204" fontSize="12" fill="var(--muted)">
              {points[0] ? dateLabel(points[0].date) : ''}
            </text>
            <text
              x="480"
              y="204"
              textAnchor="end"
              fontSize="12"
              fill="var(--muted)"
            >
              {points.at(-1) ? dateLabel(points.at(-1)!.date) : ''}
            </text>
          </svg>
          <div className="exercise-record">
            <Trophy size={20} />
            <span>Best load</span>
            <strong>
              {displayWeight(
                Math.max(0, ...points.map((p) => p.kg)),
                unit,
              ).toFixed(1)}{' '}
              {unit}
            </strong>
          </div>
          <div className="progress-entries">
            {[...points].reverse().map((p) => (
              <div key={p.id}>
                <span>{dateLabel(p.date)}</span>
                <strong>
                  {metric === 'reps'
                    ? p.reps
                    : displayWeight(p[metric], unit).toLocaleString(undefined, {
                        maximumFractionDigits: 1,
                      })}{' '}
                  {metric === 'reps' ? 'reps' : unit}
                </strong>
                {((metric === 'kg' && p.record) ||
                  (metric === 'volume' && p.volumeRecord)) && (
                  <span className="pr-badge">PR</span>
                )}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
