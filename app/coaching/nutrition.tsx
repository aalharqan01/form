'use client';
import { useI18n } from '@/app/i18n';

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
  const { t } = useI18n();
  const [editing, setEditing] = useState(false),
    [error, setError] = useState('');
  return (
    <section className="co-card nutrition-card">
      <div className="co-section-line">
        <div>
          <p className="co-overline">{t('assigned.nutritionEyebrow')}</p>
          <h2>{t('assigned.nutritionTitle')}</h2>
        </div>
        {onSave && (
          <Button className="secondary" onClick={() => setEditing(true)}>
            {targets ? t('coachWeb.editTargets') : t('coachWeb.setTargets')}
          </Button>
        )}
      </div>
      {targets ? (
        <>
          <div className="nutrition-values">
            {[
              [targets.calories, 'kcal', t('assigned.calories')],
              [targets.protein, 'g', t('assigned.protein')],
              [targets.carbs, 'g', t('assigned.carbs')],
              [targets.fat, 'g', t('assigned.fat')],
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
          {onSave ? t('coachWeb.nutritionHint') : t('assigned.noNutrition')}
        </p>
      )}
      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="form-dialog co-dialog">
          <DialogTitle>{t('coachWeb.nutritionTitle')}</DialogTitle>
          <DialogDescription>
            {t('coachWeb.nutritionDialogHint')}
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
              } else setError(t('coachWeb.nutritionError'));
            }}
          >
            <div className="co-form-grid">
              {[
                ['calories', t('coachWeb.caloriesUnit')],
                ['protein', t('coachWeb.proteinUnit')],
                ['carbs', t('coachWeb.carbsUnit')],
                ['fat', t('coachWeb.fatUnit')],
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
              {t('coachWeb.coachNotes')}
              <Textarea
                dir="auto"
                name="notes"
                maxLength={2000}
                defaultValue={targets?.notes}
                placeholder={t('coachWeb.mealHint')}
              />
            </label>
            {error && (
              <p className="co-error" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="primary full" disabled={busy}>
              {busy ? t('shell.saving') : t('coachWeb.saveTargets')}
            </Button>
            {targets && (
              <Button
                type="button"
                className="text-button"
                disabled={busy}
                onClick={async () => {
                  if (await onSave?.(null)) setEditing(false);
                  else setError(t('coachWeb.removeTargetsError'));
                }}
              >
                {t('coachWeb.removeTargets')}
              </Button>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
