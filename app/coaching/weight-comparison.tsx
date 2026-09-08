import { weeklyWeights } from '@/lib/coaching';
import { type WeighIn, dateLabel } from '@/lib/fitness';
export function weightChange(value: number | null | undefined) {
  return value == null
    ? 'No previous week to compare'
    : Math.abs(value) < 0.05
      ? 'No change vs previous week'
      : `${Math.abs(value).toFixed(1)} kg ${value > 0 ? 'gain' : 'loss'} vs previous week`;
}
export default function WeightComparison({ weights }: { weights: WeighIn[] }) {
  const weeks = weeklyWeights(weights);
  return (
    <section className="weight-comparison">
      <h3>Weekly weight changes</h3>
      <p className="co-muted">
        Monday–Sunday (UTC). The current week includes weigh-ins so far. Average
        change compares consecutive weeks; daily change is the first to last
        reading within a week.
      </p>
      {!weeks.length ? (
        <p className="co-muted">
          Weekly comparisons appear when weigh-ins are shared.
        </p>
      ) : (
        <div className="co-table-scroll">
          <table>
            <thead>
              <tr>
                <th>Week of</th>
                <th>Average</th>
                <th>Average change</th>
                <th>First → last</th>
                <th>Entries</th>
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
