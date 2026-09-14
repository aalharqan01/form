import { useI18n } from '@/app/i18n';
import { weeklyWeights } from '@/lib/coaching';
import { type WeighIn, dateLabel } from '@/lib/fitness';
export function weightChange(
  value: number | null | undefined,
  t: ReturnType<typeof useI18n>['t'],
) {
  return value == null
    ? t('mycoach.noCompare')
    : Math.abs(value) < 0.05
      ? t('coachWeb.weightNoChange')
      : t('coachWeb.weightChange', {
          change: t(value > 0 ? 'mycoach.gain' : 'mycoach.loss', {
            amount: Math.abs(value).toFixed(1),
          }),
        });
}
export default function WeightComparison({ weights }: { weights: WeighIn[] }) {
  const { t } = useI18n();
  const weeks = weeklyWeights(weights);
  return (
    <section className="weight-comparison">
      <h3>{t('coachWeb.weeklyChanges')}</h3>
      <p className="co-muted">{t('coachWeb.weeklyChangesHint')}</p>
      {!weeks.length ? (
        <p className="co-muted">{t('coachWeb.weeklyChangesEmpty')}</p>
      ) : (
        <div className="co-table-scroll">
          <table className="co-numeric-table">
            <thead>
              <tr>
                <th>{t('coachWeb.week')}</th>
                <th>{t('coachWeb.average')}</th>
                <th>{t('coachWeb.averageChange')}</th>
                <th>{t('coachWeb.firstLast')}</th>
                <th>{t('coachWeb.entries')}</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w) => (
                <tr key={w.week}>
                  <td>{dateLabel(w.week, true)}</td>
                  <td>{w.averageKg.toFixed(1)} kg</td>
                  <td>
                    {w.changeKg == null
                      ? '—'
                      : `${w.changeKg > 0 ? '+' : ''}${w.changeKg.toFixed(1)} kg`}
                  </td>
                  <td>
                    {w.withinWeekKg == null
                      ? '—'
                      : `${w.withinWeekKg > 0 ? '+' : ''}${w.withinWeekKg.toFixed(1)} kg`}
                  </td>
                  <td>{w.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
