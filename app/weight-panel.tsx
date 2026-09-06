'use client';
import { useState } from 'react';
import {
  Plus,
  ArrowDownRight,
  ArrowUpRight,
  Target,
  Scale,
  Pencil,
  Trash2,
  ArrowUpRight as Arrow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  type FitnessData,
  type WeighIn,
  trendStats,
  displayWeight,
  toKg,
  dateLabel,
  dayDiff,
  today,
  weightInsights,
} from '@/lib/fitness';
// SVG charts expose their purpose through the image role.
/* oxlint-disable jsx-a11y/prefer-tag-over-role */
type Props = {
  data: FitnessData;
  update: (fn: (d: FitnessData) => FitnessData) => void;
};
export default function WeightPanel({ data, update }: Props) {
  const [range, setRange] = useState(30),
    [modal, setModal] = useState<'weight' | 'goal' | null>(null),
    [editing, setEditing] = useState<string | null>(null),
    [date, setDate] = useState(today),
    [value, setValue] = useState(''),
    [note, setNote] = useState(''),
    [formError, setFormError] = useState(''),
    [remove, setRemove] = useState<string | null>(null),
    [hover, setHover] = useState<number | null>(null);
  const stats = trendStats(data.weights, data.goal),
    unit = data.unit;
  const insights = weightInsights(data.weights, data.goal);
  const format = (n: number) => displayWeight(n, unit).toFixed(1);
  const points = stats.points.filter(
      (p) => range === 0 || dayDiff(today(), p.date) < range,
    ),
    latest = stats.latest;
  const values = points.flatMap((p) => [p.kg, p.trend]);
  const min = Math.floor((Math.min(...values, latest?.kg ?? 70) - 0.5) * 2) / 2,
    max = Math.ceil((Math.max(...values, latest?.kg ?? 71) + 0.5) * 2) / 2;
  const x = (i: number) =>
    points.length === 1
      ? 270
      : 50 +
        ((Date.parse(points[i].date) - Date.parse(points[0].date)) /
          (Date.parse(points.at(-1)!.date) - Date.parse(points[0].date))) *
          480;
  const y = (n: number) => 20 + ((max - n) / (max - min)) * 176;
  const line = (key: 'kg' | 'trend') =>
    points
      .map(
        (p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)},${y(p[key]).toFixed(2)}`,
      )
      .join(' ');
  function openWeight(entry?: WeighIn) {
    setEditing(entry?.date ?? null);
    setDate(entry?.date ?? today());
    setValue(entry ? format(entry.kg) : '');
    setNote(entry?.note ?? '');
    setFormError('');
    setModal('weight');
  }
  function saveWeight(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const kg = toKg(Number(value), unit);
    if (!value || kg < 20 || kg > 500 || date > today()) {
      setFormError('Enter a valid weight and a date up to today.');
      return;
    }
    if (data.weights.some((w) => w.date === date && w.date !== editing)) {
      setFormError(
        'There is already a weigh-in for this day. Edit that entry below.',
      );
      return;
    }
    update((d) => ({
      ...d,
      weights: [
        ...d.weights.filter((w) => w.date !== editing),
        { date, kg, note },
      ].sort((a, b) => a.date.localeCompare(b.date)),
    }));
    setModal(null);
  }
  return (
    <>
      <div className="page-heading weight-heading">
        <div>
          <p className="eyebrow">BODY WEIGHT</p>
          <h1>
            Weight
            <br />
            <span>trends.</span>
          </h1>
        </div>
        <Button className="primary" onClick={() => openWeight()}>
          Log weight{' '}
          <span className="button-orb">
            <Plus size={20} />
          </span>
        </Button>
      </div>
      <div className="weight-layout">
        <section className="bezel chart-bezel">
          <div className="card chart-card">
            <div className="section-label">
              WEIGHT TREND{' '}
              <span className="unit-switch">
                <button
                  aria-pressed={unit === 'kg'}
                  onClick={() => update((d) => ({ ...d, unit: 'kg' }))}
                >
                  kg
                </button>
                <button
                  aria-pressed={unit === 'lb'}
                  onClick={() => update((d) => ({ ...d, unit: 'lb' }))}
                >
                  lb
                </button>
              </span>
            </div>
            <div className="weight-reading">
              <div>
                <span className="big-number">
                  {latest ? format(latest.trend) : '—'}
                </span>
                <span className="reading-unit">{unit}</span>
                <p>Smoothed weight</p>
              </div>
              {stats.rate !== null ? (
                <div className="trend-badge">
                  {stats.rate < 0 ? (
                    <ArrowDownRight size={19} />
                  ) : (
                    <ArrowUpRight size={19} />
                  )}{' '}
                  {format(Math.abs(stats.rate))} {unit} / week
                </div>
              ) : (
                <span className="small-muted">
                  {latest ? 'Building your trend' : 'No entries'}
                </span>
              )}
            </div>
            <div
              className="range-switch"
              role="group"
              aria-label="Chart period"
            >
              {[
                [30, '1 month'],
                [90, '3 months'],
                [180, '6 months'],
                [0, 'All time'],
              ].map(([n, label]) => (
                <button
                  key={n}
                  aria-pressed={range === n}
                  onClick={() => {
                    setRange(Number(n));
                    setHover(null);
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            {points.length ? (
              <div className="chart-wrap">
                <svg
                  viewBox="0 0 570 236"
                  role="img"
                  aria-label={`Daily weight and smoothed trend, ${dateLabel(points[0].date)} to ${dateLabel(points.at(-1)!.date)}.`}
                >
                  <defs>
                    <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#719746" stopOpacity=".18" />
                      <stop offset="100%" stopColor="#719746" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[0, 1, 2, 3].map((i) => {
                    const n = min + ((max - min) * i) / 3;
                    return (
                      <g key={i}>
                        <line
                          x1="50"
                          x2="535"
                          y1={y(n)}
                          y2={y(n)}
                          stroke="#e8ece3"
                          strokeDasharray="3 5"
                        />
                        <text x="0" y={y(n) + 4} fill="#788578" fontSize="12">
                          {format(n)}
                        </text>
                      </g>
                    );
                  })}
                  {points.length > 1 && (
                    <>
                      <path
                        d={`${line('trend')} L${x(points.length - 1)},202 L${x(0)},202 Z`}
                        fill="url(#trend-fill)"
                      />
                      <path
                        d={line('kg')}
                        fill="none"
                        stroke="#b8c5ae"
                        strokeWidth="1.5"
                      />
                      <path
                        d={line('trend')}
                        fill="none"
                        stroke="#456f36"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </>
                  )}
                  {points.map((p, i) => (
                    <g
                      key={p.date}
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => setHover(i)}
                    >
                      <circle
                        cx={x(i)}
                        cy={y(p.kg)}
                        r={hover === i ? 5 : 3}
                        fill="#fff"
                        stroke="#9cad8b"
                        strokeWidth="1.5"
                      />
                      <circle
                        cx={x(i)}
                        cy={y(p.kg)}
                        r="12"
                        fill="transparent"
                      />
                      {points.length === 1 && (
                        <circle
                          cx={x(i)}
                          cy={y(p.trend)}
                          r="5"
                          fill="#456f36"
                        />
                      )}
                    </g>
                  ))}
                  <text x="50" y="228" fill="#788578" fontSize="12">
                    {dateLabel(points[0].date)}
                  </text>
                  <text
                    x="532"
                    y="228"
                    textAnchor="end"
                    fill="#788578"
                    fontSize="12"
                  >
                    {dateLabel(points.at(-1)!.date)}
                  </text>
                </svg>
                <div className="chart-caption">
                  {hover !== null && points[hover] ? (
                    `${dateLabel(points[hover].date)} · ${format(points[hover].kg)} ${unit} · trend ${format(points[hover].trend)} ${unit}`
                  ) : (
                    <>
                      <span>
                        <i className="legend-trend" />
                        Smoothed trend
                      </span>
                      <span>
                        <i className="legend-daily" />
                        Daily weigh-ins
                      </span>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="chart-empty">
                <Scale size={35} strokeWidth={1.2} />
                <h3>
                  {data.weights.length
                    ? 'No entries in this period'
                    : 'No weigh-ins yet'}
                </h3>
                <p>
                  {data.weights.length
                    ? 'Choose a longer period to see your history.'
                    : 'Add your first weigh-in to begin.'}
                </p>
                {!data.weights.length && (
                  <Button className="text-button" onClick={() => openWeight()}>
                    Log your first weight <Plus size={16} />
                  </Button>
                )}
              </div>
            )}
            <details className="trend-explainer">
              <summary>How your trend works</summary>
              <p>
                A seven-day exponential smoother reduces daily noise and
                accounts for gaps between entries. Your weekly rate compares
                trend readings at least seven days apart. This is Form’s own
                calculation, not Happy Scale’s algorithm.
              </p>
            </details>
          </div>
        </section>
        <div className="weight-side">
          <section className="bezel goal-bezel">
            <div className="card">
              <div className="section-label">
                YOUR DIRECTION <Target size={19} strokeWidth={1.4} />
              </div>
              <h2>
                {data.goal !== null ? (
                  <>
                    {format(data.goal)} <small>{unit}</small>
                  </>
                ) : (
                  'Set a goal'
                )}
              </h2>
              <p>
                {data.goal !== null && stats.remaining !== null
                  ? `${format(stats.remaining)} ${unit} between your trend and goal.`
                  : 'Choose a weight to work toward, at your own pace.'}
              </p>
              {data.goal !== null && (
                <div
                  className="goal-progress"
                  aria-label={`${Math.round(stats.progress * 100)}% of weight goal reached`}
                >
                  <div style={{ transform: `scaleX(${stats.progress})` }} />
                </div>
              )}
              <Button
                className="secondary"
                onClick={() => {
                  setValue(data.goal !== null ? format(data.goal) : '');
                  setFormError('');
                  setModal('goal');
                }}
              >
                {data.goal !== null ? 'Edit goal' : 'Set a goal'}
                <Arrow size={16} />
              </Button>
            </div>
          </section>
          <section className="quick-facts">
            <div>
              <span>Latest weigh-in</span>
              <strong>{latest ? `${format(latest.kg)} ${unit}` : '—'}</strong>
              <small>
                {latest ? dateLabel(latest.date, true) : 'Ready when you are'}
              </small>
            </div>
            <div>
              <span>Total change</span>
              <strong>
                {stats.points.length > 1
                  ? `${latest!.kg - stats.points[0].kg > 0 ? '+' : ''}${format(latest!.kg - stats.points[0].kg)} ${unit}`
                  : '—'}
              </strong>
              <small>From your first weigh-in</small>
            </div>
          </section>
        </div>
      </div>
      <section className="weight-insights">
        <div>
          <span>7-day average</span>
          <strong>
            {insights.average === null
              ? '—'
              : `${format(insights.average)} ${unit}`}
          </strong>
          <small>{insights.count} weigh-ins in the last 7 days</small>
        </div>
        <div>
          <span>Estimated goal date</span>
          <strong>
            {insights.estimate ? dateLabel(insights.estimate, true) : '—'}
          </strong>
          <small>{insights.reason}</small>
        </div>
      </section>
      {insights.milestones.length > 0 && (
        <section className="milestones">
          <h3>Goal milestones</h3>
          <div>
            {insights.milestones.map((m) => (
              <div key={m.fraction} className={m.reached ? 'reached' : ''}>
                <span>{Math.round(m.fraction * 100)}%</span>
                <strong>
                  {format(m.kg)} {unit}
                </strong>
                <small>{m.reached ? 'Reached' : 'Upcoming'}</small>
              </div>
            ))}
          </div>
        </section>
      )}
      <div className="section-title">
        <h2>
          Weigh-in history <span className="count">{data.weights.length}</span>
        </h2>
        <Button className="text-button" onClick={() => openWeight()}>
          <Plus size={17} />
          Add entry
        </Button>
      </div>
      <div className="log-list">
        {[...data.weights].reverse().map((w) => (
          <div className="weight-row" key={w.date}>
            <div className="date-tile">
              <strong>{new Date(w.date + 'T12:00:00').getDate()}</strong>
              <span>
                {new Date(w.date + 'T12:00:00').toLocaleDateString('en-GB', {
                  month: 'short',
                })}
              </span>
            </div>
            <div className="weight-row-info">
              <strong>
                {format(w.kg)} <small>{unit}</small>
              </strong>
              <p>
                {w.note ||
                  new Date(w.date + 'T12:00:00').toLocaleDateString('en-GB', {
                    weekday: 'long',
                    year: 'numeric',
                  })}
              </p>
            </div>
            <Button
              variant="ghost"
              className="icon-button"
              aria-label={`Edit weigh-in ${w.date}`}
              onClick={() => openWeight(w)}
            >
              <Pencil size={17} />
            </Button>
            <Button
              variant="ghost"
              className="icon-button"
              aria-label={`Delete weigh-in ${w.date}`}
              onClick={() => setRemove(w.date)}
            >
              <Trash2 size={17} />
            </Button>
          </div>
        ))}
        {!data.weights.length && (
          <p className="empty-line">Your weigh-ins will be collected here.</p>
        )}
      </div>
      <Dialog
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <DialogContent className="form-dialog">
          <DialogTitle>
            {modal === 'goal'
              ? 'Set goal'
              : editing
                ? 'Edit weigh-in'
                : 'Log weight'}
          </DialogTitle>
          <DialogDescription>
            {modal === 'goal'
              ? 'Enter a goal weight.'
              : 'Daily fluctuations are normal. The trend tells the story.'}
          </DialogDescription>
          <form
            onSubmit={
              modal === 'weight'
                ? saveWeight
                : (e) => {
                    e.preventDefault();
                    const kg = toKg(Number(value), unit);
                    if (!value || kg < 20 || kg > 500) {
                      setFormError(
                        'Enter a goal between 20 and 500 kg (or its equivalent).',
                      );
                      return;
                    }
                    update((d) => ({ ...d, goal: kg }));
                    setModal(null);
                  }
            }
          >
            <label className="field-label">
              {modal === 'goal' ? 'Goal weight' : 'Weight'} ({unit})
              <Input
                required
                type="number"
                step="0.1"
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="large-input"
                placeholder={unit === 'kg' ? '75.0' : '165.0'}
              />
            </label>
            {modal === 'weight' && (
              <>
                <label className="field-label">
                  Date
                  <Input
                    required
                    type="date"
                    value={date}
                    max={today()}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </label>
                <label className="field-label">
                  Note <span>optional</span>
                  <Input
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={500}
                    placeholder="Anything worth remembering?"
                  />
                </label>
              </>
            )}
            {formError && (
              <p role="alert" className="error-text">
                {formError}
              </p>
            )}
            <Button type="submit" className="primary full">
              {modal === 'goal' ? 'Save goal' : 'Save weigh-in'}
              <span className="button-orb">
                <Plus size={19} />
              </span>
            </Button>
            {modal === 'goal' && data.goal !== null && (
              <Button
                type="button"
                className="text-button full"
                onClick={() => {
                  update((d) => ({ ...d, goal: null }));
                  setModal(null);
                }}
              >
                Remove goal
              </Button>
            )}
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!remove}
        onOpenChange={(open) => {
          if (!open) setRemove(null);
        }}
      >
        <DialogContent className="form-dialog">
          <DialogTitle>Delete this weigh-in?</DialogTitle>
          <DialogDescription>
            This removes the {remove ? dateLabel(remove, true) : ''} entry and
            recalculates your trend.
          </DialogDescription>
          <Button
            className="danger-button"
            onClick={() => {
              update((d) => ({
                ...d,
                weights: d.weights.filter((w) => w.date !== remove),
              }));
              setRemove(null);
            }}
          >
            Delete weigh-in
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
