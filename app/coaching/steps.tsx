'use client';
import { useI18n } from '@/app/i18n';

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
  const { t } = useI18n();
  const [editing, setEditing] = useState(false),
    [error, setError] = useState('');
  const goal = member.stepGoal;
  const average = member.stats?.stepsAverage ?? null;
  const days = member.stats?.stepsDays ?? 0;
  return (
    <section className="co-card steps-card">
      <div className="co-section-line">
        <div>
          <p className="co-overline">{t('steps.cardEyebrow')}</p>
          <h2>{t('steps.cardTitle')}</h2>
        </div>
        {onSave && (
          <Button className="secondary" onClick={() => setEditing(true)}>
            {goal ? t('weight.editGoal') : t('weight.setGoalTitle')}
          </Button>
        )}
      </div>
      <div className="steps-values">
        <div>
          <span>{t('steps.goalPerDay')}</span>
          <strong>
            {goal ? goal.toLocaleString() : '—'}
            {goal ? <small> {t('steps.steps')}</small> : null}
          </strong>
        </div>
        <div>
          <span>{t('coachWeb.stepsAverage')}</span>
          <strong>
            {average === null ? '—' : average.toLocaleString()}
            {average !== null ? <small> {t('steps.steps')}</small> : null}
          </strong>
        </div>
        <div>
          <span>{t('steps.daysLogged')}</span>
          <strong>
            {days}
            <small> {t('steps.of7')}</small>
          </strong>
        </div>
      </div>
      <p className="co-muted steps-note">
        <Footprints size={14} aria-hidden="true" />
        {goal
          ? onSave
            ? t('coachWeb.clientStepHint')
            : t('coachWeb.traineeStepHint')
          : onSave
            ? t('coachWeb.setClientStepHint')
            : t('coachWeb.noStepHint')}
      </p>
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="form-dialog co-dialog">
          <DialogTitle>{t('steps.goalTitle')}</DialogTitle>
          <DialogDescription>{t('coachWeb.stepDialogHint')}</DialogDescription>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const raw = new FormData(e.currentTarget).get('steps');
              const value = typeof raw === 'string' ? Number(raw) : NaN;
              if (await onSave?.(value)) {
                setEditing(false);
                setError('');
              } else setError(t('coachWeb.stepError'));
            }}
          >
            <label>
              {t('steps.perDay')}
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
              {t('weight.saveGoal')}
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
                {t('weight.removeGoal')}
              </Button>
            ) : null}
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
