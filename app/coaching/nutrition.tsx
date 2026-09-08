'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { type NutritionTargets } from '@/lib/coaching';
export default function Nutrition({
  targets,
  onSave,
  busy = false,
}: {
  targets?: NutritionTargets | null;
  onSave?: (v: NutritionTargets | null) => Promise<boolean>;
  busy?: boolean;
}) {
  const [editing, setEditing] = useState(false),
    [error, setError] = useState('');
  return (
    <section className="co-card nutrition-card">
      <div className="co-section-line">
        <div>
          <p className="co-overline">DAILY NUTRITION</p>
          <h2>Calorie & macro targets</h2>
        </div>
        {onSave && (
          <Button className="secondary" onClick={() => setEditing(true)}>
            {targets ? 'Edit targets' : 'Set targets'}
          </Button>
        )}
      </div>
      {targets ? (
        <>
          <div className="nutrition-values">
            {[
              [targets.calories, 'kcal', 'Calories'],
              [targets.protein, 'g', 'Protein'],
              [targets.carbs, 'g', 'Carbs'],
              [targets.fat, 'g', 'Fat'],
            ].map(([v, u, l]) => (
              <div key={l}>
                <span>{l}</span>
                <strong>
                  {v}
                  <small> {u}</small>
                </strong>
              </div>
            ))}
          </div>
          {targets.notes && <p className="co-program-note">{targets.notes}</p>}
        </>
      ) : (
        <p className="co-muted">
          {onSave
            ? 'Set the daily targets this client will see with their workouts.'
            : 'Your coach hasn’t set nutrition targets yet.'}
        </p>
      )}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="form-dialog co-dialog">
          <DialogTitle>Daily nutrition targets</DialogTitle>
          <DialogDescription>
            These are the targets your trainee will see each day.
          </DialogDescription>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const value = {
                calories: Number(data.get('calories')),
                protein: Number(data.get('protein')),
                carbs: Number(data.get('carbs')),
                fat: Number(data.get('fat')),
                notes: (data.get('notes') as string) ?? '',
              };
              if (await onSave?.(value)) {
                setEditing(false);
                setError('');
              } else
                setError(
                  'Couldn’t save the targets. Reload this client and try again.',
                );
            }}
          >
            <div className="co-form-grid">
              {[
                ['calories', 'Calories (kcal)'],
                ['protein', 'Protein (g)'],
                ['carbs', 'Carbs (g)'],
                ['fat', 'Fat (g)'],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <Input
                    name={key}
                    type="number"
                    required
                    min={key === 'calories' ? 1 : 0}
                    max={key === 'calories' ? 10000 : 1500}
                    step={key === 'calories' ? 1 : 0.1}
                    defaultValue={targets?.[key as 'calories']}
                  />
                </label>
              ))}
            </div>
            <label>
              Coach notes
              <Textarea
                name="notes"
                maxLength={2000}
                defaultValue={targets?.notes}
                placeholder="Meal timing or other guidance"
              />
            </label>
            {error && (
              <p className="co-error" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="primary full" disabled={busy}>
              {busy ? 'Saving…' : 'Save targets'}
            </Button>
            {targets && (
              <Button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={async () => {
                  if (await onSave?.(null)) setEditing(false);
                  else setError('Couldn’t remove targets. Please retry.');
                }}
              >
                Remove targets
              </Button>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
