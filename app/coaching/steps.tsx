'use client';
import { useState } from 'react';
import { Footprints } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import type { Member } from '@/lib/coaching';

/**
 * Daily steps for one membership: the agreed goal and the last seven days.
 * Both the coach and the trainee can set the goal; each sees the other's value.
 */
export default function Steps({
  member,
  onSave,
  busy = false,
}: {
  member: Pick<Member, 'stepGoal' | 'stats'>;
  onSave?: (goal: number | null) => Promise<boolean>;
  busy?: boolean;
}) {
  const [editing, setEditing] = useState(false),
    [error, setError] = useState('');
  const goal = member.stepGoal;
  const average = member.stats?.stepsAverage ?? null;
  const days = member.stats?.stepsDays ?? 0;
  return (
    <section className="co-card steps-card">
      <div className="co-section-line">
        <div>
          <p className="co-overline">DAILY STEPS</p>
          <h2>Step goal</h2>
        </div>
        {onSave && (
          <Button className="secondary" onClick={() => setEditing(true)}>
            {goal ? 'Edit goal' : 'Set goal'}
          </Button>
        )}
      </div>
      <div className="steps-values">
        <div>
          <span>Goal per day</span>
          <strong>
            {goal ? goal.toLocaleString() : '—'}
            {goal ? <small> steps</small> : null}
          </strong>
        </div>
        <div>
          <span>Average · last 7 days</span>
          <strong>
            {average === null ? '—' : average.toLocaleString()}
            {average !== null ? <small> steps</small> : null}
          </strong>
        </div>
        <div>
          <span>Days logged</span>
          <strong>
            {days}
            <small> of 7</small>
          </strong>
        </div>
      </div>
      <p className="co-muted steps-note">
        <Footprints size={14} aria-hidden="true" />
        {goal
          ? onSave
            ? 'Your client can adjust this goal in the app; you will see their change here.'
            : 'You can change this goal in the app; your coach sees the change.'
          : onSave
            ? 'Set a daily goal, or let your client set their own in the app.'
            : 'No step goal yet. Set one in the app or ask your coach.'}
      </p>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="form-dialog co-dialog">
          <DialogTitle>Daily step goal</DialogTitle>
          <DialogDescription>
            Steps per day for this client. They see it in the app and can adjust
            it.
          </DialogDescription>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const raw = new FormData(e.currentTarget).get('steps');
              const value = typeof raw === 'string' ? Number(raw) : NaN;
              if (await onSave?.(value)) {
                setEditing(false);
                setError('');
              } else
                setError(
                  'Couldn’t save the goal. Reload this client and try again.',
                );
            }}
          >
            <label>
              Steps per day
              <Input
                name="steps"
                type="number"
                required
                min={500}
                max={100000}
                step={100}
                defaultValue={goal ?? 8000}
              />
            </label>
            {error && (
              <p className="co-error" role="alert">
                {error}
              </p>
            )}
            <Button className="primary full" type="submit" disabled={busy}>
              Save goal
            </Button>
            {goal ? (
              <Button
                type="button"
                variant="ghost"
                className="full"
                disabled={busy}
                onClick={async () => {
                  if (await onSave?.(null)) setEditing(false);
                }}
              >
                Remove goal
              </Button>
            ) : null}
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
