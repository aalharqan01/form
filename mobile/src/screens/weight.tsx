import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { ArrowDownRight, ArrowUpRight, Pencil, Plus, Scale, Target, Trash2 } from 'lucide-react-native';
import {
  dateLabel,
  dayDiff,
  displayWeight,
  toKg,
  today,
  trendStats,
  validDate,
  weightInsights,
  type WeighIn,
} from '../../../lib/fitness';
import { weekOf, weeklyWeights } from '../../../lib/coaching';
import type { Training } from '../use-training';
import { font, useTheme } from '../theme';
import {
  Bezel,
  Body,
  Card,
  DangerButton,
  DateTile,
  Disclosure,
  Field,
  H2,
  IconButton,
  Input,
  PageHeading,
  PrimaryButton,
  SecondaryButton,
  SectionLabel,
  SectionTitle,
  Segmented,
  Sheet,
  T,
  TextButton,
} from '../ui';
import { signedKg, type Act } from './shared';

function Insight({ label, value, note }: { label: string; value: string; note: string }) {
  const { theme } = useTheme();
  return (
    <View style={{ flex: 1, minWidth: '45%', gap: 6, backgroundColor: theme.surface, borderRadius: 22, padding: 18 }}>
      <Body size={13}>{label}</Body>
      <T weight={500} size={23} line={27} tracking={-0.9}>
        {value}
      </T>
      <Body size={12}>{note}</Body>
    </View>
  );
}

export function WeightScreen({ training, act, busy }: { training: Training; act: Act; busy: boolean }) {
  const { theme } = useTheme();
  const { data, update } = training;
  const [range, setRange] = useState(30),
    [modal, setModal] = useState<'weight' | 'goal' | null>(null),
    [editing, setEditing] = useState<string | null>(null),
    [date, setDate] = useState(today()),
    [value, setValue] = useState(''),
    [note, setNote] = useState(''),
    [formError, setFormError] = useState(''),
    [remove, setRemove] = useState<string | null>(null);
  const svgFont = font(400).fontFamily;
  const unit = data.unit;
  const stats = trendStats(data.weights, data.goal);
  const insights = weightInsights(data.weights, data.goal);
  const format = (n: number) => displayWeight(n, unit).toFixed(1);
  const points = stats.points.filter((p) => range === 0 || dayDiff(today(), p.date) < range),
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
    points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(2)},${y(p[key]).toFixed(2)}`).join(' ');
  const weeks = weeklyWeights(data.weights),
    currentWeek = weeks.find((w) => w.week === weekOf());
  function openWeight(entry?: WeighIn) {
    setEditing(entry?.date ?? null);
    setDate(entry?.date ?? today());
    setValue(entry ? format(entry.kg) : '');
    setNote(entry?.note ?? '');
    setFormError('');
    setModal('weight');
  }
  function saveWeight() {
    const kg = toKg(Number(value), unit);
    if (!value.trim() || !Number.isFinite(kg) || kg < 20 || kg > 500 || !validDate(date) || date > today()) {
      setFormError('Enter a valid weight and a date (YYYY-MM-DD) up to today.');
      return;
    }
    if (data.weights.some((w) => w.date === date && w.date !== editing)) {
      setFormError('There is already a weigh-in for this day. Edit that entry below.');
      return;
    }
    const previousDate = editing;
    act(
      () =>
        update((d) => ({
          ...d,
          weights: [...d.weights.filter((w) => w.date !== previousDate), { date, kg, note }].sort((a, b) =>
            a.date.localeCompare(b.date),
          ),
        })),
      'Weigh-in saved. Your weekly averages update automatically.',
    );
    setModal(null);
  }
  const chartLabel = points.length
    ? `Daily weight and smoothed trend, ${dateLabel(points[0].date)} to ${dateLabel(points.at(-1)!.date)}.`
    : 'No weigh-ins in this period';
  return (
    <>
      <PageHeading eyebrow="BODY WEIGHT" first="Weight" second="trends." />
      <View style={{ marginTop: -8, marginBottom: 16 }}>
        <PrimaryButton
          full
          label="Log weight"
          icon={<Plus size={20} color={theme.primaryText} />}
          onPress={() => openWeight()}
        />
      </View>
      <Bezel>
        <Card padding={21}>
          <SectionLabel
            right={
              <Segmented
                compact
                accessibilityLabel="Body weight unit"
                options={[
                  { value: 'kg', label: 'kg' },
                  { value: 'lb', label: 'lb' },
                ]}
                labelFor={(o) => `Body weight in ${o.label}`}
                value={unit}
                onChange={(next) => act(() => update((d) => ({ ...d, unit: next })))}
              />
            }
          >
            WEIGHT TREND
          </SectionLabel>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7, marginTop: 8, marginBottom: 22 }}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                <T weight={500} size={58} line={62} tracking={-4.3}>
                  {latest ? format(latest.trend) : '—'}
                </T>
                <T size={17} color={theme.placeholder} style={{ marginLeft: 10 }}>
                  {unit}
                </T>
              </View>
              <Body size={12} style={{ marginTop: 6 }}>
                Smoothed weight
              </Body>
            </View>
            {stats.rate !== null ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 3,
                  paddingVertical: 7,
                  paddingHorizontal: 8,
                  borderRadius: 10,
                  backgroundColor: theme.scheme === 'dark' ? theme.soft : '#edf3e3',
                }}
              >
                {stats.rate < 0 ? (
                  <ArrowDownRight size={17} color={theme.scheme === 'dark' ? theme.green : '#598047'} />
                ) : (
                  <ArrowUpRight size={17} color={theme.scheme === 'dark' ? theme.green : '#598047'} />
                )}
                <T size={10} line={13} color={theme.scheme === 'dark' ? theme.green : '#598047'}>
                  {format(Math.abs(stats.rate))} {unit} / week
                </T>
              </View>
            ) : (
              <Body size={11}>{latest ? 'Building your trend' : 'No entries'}</Body>
            )}
          </View>
          <Segmented
            accessibilityLabel="Chart period"
            options={[
              { value: 30, label: '1 month' },
              { value: 90, label: '3 months' },
              { value: 180, label: '6 months' },
              { value: 0, label: 'All time' },
            ]}
            value={range}
            onChange={setRange}
          />
          {points.length ? (
            <View style={{ marginTop: 24, marginBottom: 8 }}>
              <Svg width="100%" height={undefined} viewBox="0 0 570 236" style={{ aspectRatio: 570 / 236 }} accessibilityLabel={chartLabel}>
                <Defs>
                  <LinearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0%" stopColor={theme.trendLine} stopOpacity={0.18} />
                    <Stop offset="100%" stopColor={theme.trendLine} stopOpacity={0} />
                  </LinearGradient>
                </Defs>
                {[0, 1, 2, 3].map((i) => {
                  const n = min + ((max - min) * i) / 3;
                  return (
                    <Line key={i} x1={50} x2={535} y1={y(n)} y2={y(n)} stroke={theme.grid} strokeDasharray="3 5" />
                  );
                })}
                {[0, 1, 2, 3].map((i) => {
                  const n = min + ((max - min) * i) / 3;
                  return (
                    <SvgText key={'t' + i} x={0} y={y(n) + 4} fill={theme.axis} fontSize={12} fontFamily={svgFont}>
                      {format(n)}
                    </SvgText>
                  );
                })}
                {points.length > 1 && (
                  <>
                    <Path d={`${line('trend')} L${x(points.length - 1)},202 L${x(0)},202 Z`} fill="url(#trend-fill)" />
                    <Path d={line('kg')} fill="none" stroke={theme.dailyLine} strokeWidth={1.5} />
                    <Path d={line('trend')} fill="none" stroke={theme.trendLine} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
                  </>
                )}
                {points.map((p, i) => (
                  <Circle
                    key={p.date}
                    cx={x(i)}
                    cy={y(p.kg)}
                    r={3.5}
                    fill={theme.surface}
                    stroke={theme.dot}
                    strokeWidth={1.5}
                  />
                ))}
                {points.length === 1 && <Circle cx={x(0)} cy={y(points[0].trend)} r={5} fill={theme.trendLine} />}
                <SvgText x={50} y={228} fill={theme.axis} fontSize={12} fontFamily={svgFont}>
                  {dateLabel(points[0].date)}
                </SvgText>
                <SvgText x={532} y={228} textAnchor="end" fill={theme.axis} fontSize={12} fontFamily={svgFont}>
                  {dateLabel(points.at(-1)!.date)}
                </SvgText>
              </Svg>
              <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 18, minHeight: 30 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 15, height: 2, backgroundColor: theme.trendLine }} />
                  <Body size={11}>Smoothed trend</Body>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, borderWidth: 1, borderColor: theme.dot }} />
                  <Body size={11}>Daily weigh-ins</Body>
                </View>
              </View>
            </View>
          ) : (
            <View style={{ height: 200, alignItems: 'center', justifyContent: 'center', gap: 9 }}>
              <Scale size={35} strokeWidth={1.2} color={theme.routineMarkText} />
              <T weight={500} size={18} line={22} color={theme.secondaryText}>
                {data.weights.length ? 'No entries in this period' : 'No weigh-ins yet'}
              </T>
              <Body size={13}>
                {data.weights.length ? 'Choose a longer period to see your history.' : 'Add your first weigh-in to begin.'}
              </Body>
            </View>
          )}
          <Disclosure summary="How your trend works" style={{ borderTopWidth: 1, borderColor: theme.line, marginTop: 8, paddingTop: 6 }}>
            <Body size={12} style={{ marginBottom: 8 }}>
              A seven-day exponential smoother reduces daily noise and accounts for gaps between entries.
              Your weekly rate compares trend readings at least seven days apart.
            </Body>
          </Disclosure>
        </Card>
      </Bezel>
      <View style={{ flexDirection: 'row', gap: 13, marginTop: 16 }}>
        <Bezel style={{ flex: 1 }}>
          <Card background={theme.goal} padding={20} style={{ flex: 1 }}>
            <SectionLabel style={{ marginBottom: 18 }} right={<Target size={19} strokeWidth={1.4} color={theme.featureLabel} />}>
              YOUR DIRECTION
            </SectionLabel>
            <T weight={500} size={28} line={31} tracking={-1.5}>
              {data.goal !== null ? (
                <>
                  {format(data.goal)}{' '}
                  <T size={17} color={theme.goalText}>
                    {unit}
                  </T>
                </>
              ) : (
                'Set a goal'
              )}
            </T>
            <Body size={11} color={theme.goalText} style={{ marginTop: 12 }}>
              {data.goal !== null && stats.remaining !== null
                ? `${format(stats.remaining)} ${unit} between your trend and goal.`
                : 'Choose a weight to work toward, at your own pace.'}
            </Body>
            {data.goal !== null && (
              <View
                accessibilityLabel={`${Math.round(stats.progress * 100)}% of weight goal reached`}
                style={{ height: 5, backgroundColor: theme.goalButton, marginTop: 20, borderRadius: 10, overflow: 'hidden' }}
              >
                <View style={{ height: '100%', width: `${Math.round(stats.progress * 100)}%`, backgroundColor: theme.scheme === 'dark' ? theme.green : '#6f8f44' }} />
              </View>
            )}
            <View style={{ marginTop: 'auto', paddingTop: 20 }}>
              <SecondaryButton
                label={data.goal !== null ? 'Edit goal' : 'Set a goal'}
                height={40}
                size={11}
                background={theme.goalButton}
                icon={<ArrowUpRight size={14} color={theme.secondaryText} />}
                onPress={() => {
                  setValue(data.goal !== null ? format(data.goal) : '');
                  setFormError('');
                  setModal('goal');
                }}
              />
            </View>
          </Card>
        </Bezel>
        <View style={{ flex: 1, gap: 18, paddingVertical: 13, paddingLeft: 6 }}>
          <View style={{ gap: 4 }}>
            <Body size={11}>Latest weigh-in</Body>
            <T weight={500} size={22} line={26} tracking={-0.9}>
              {latest ? `${format(latest.kg)} ${unit}` : '—'}
            </T>
            <Body size={10}>{latest ? dateLabel(latest.date, true) : 'Ready when you are'}</Body>
          </View>
          <View style={{ gap: 4 }}>
            <Body size={11}>Total change</Body>
            <T weight={500} size={22} line={26} tracking={-0.9}>
              {stats.points.length > 1
                ? `${latest!.kg - stats.points[0].kg > 0 ? '+' : ''}${format(latest!.kg - stats.points[0].kg)} ${unit}`
                : '—'}
            </T>
            <Body size={10}>From your first weigh-in</Body>
          </View>
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 24 }}>
        <Insight
          label="This week’s average"
          value={currentWeek ? `${format(currentWeek.averageKg)} ${unit}` : '—'}
          note={`${currentWeek?.count ?? 0} weigh-ins · Monday to Sunday`}
        />
        <Insight
          label="Change vs last week"
          value={signedKg(currentWeek?.changeKg, unit)}
          note={currentWeek?.changeKg == null ? 'Needs readings in both weeks.' : 'Average of this week so far.'}
        />
        <Insight
          label="7-day average"
          value={insights.average === null ? '—' : `${format(insights.average)} ${unit}`}
          note={`${insights.count} weigh-ins in the last 7 days`}
        />
        <Insight
          label="Estimated goal date"
          value={insights.estimate ? dateLabel(insights.estimate, true) : '—'}
          note={insights.reason}
        />
      </View>
      {insights.milestones.length > 0 && (
        <Card padding={20} style={{ marginTop: 20 }}>
          <H2 size={16}>Goal milestones</H2>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 22 }}>
            {insights.milestones.map((m) => (
              <View
                key={m.fraction}
                style={{
                  minWidth: '40%',
                  flex: 1,
                  gap: 7,
                  borderTopWidth: 3,
                  borderColor: m.reached ? theme.green : theme.deep,
                  paddingTop: 14,
                }}
              >
                <Body size={11}>{Math.round(m.fraction * 100)}%</Body>
                <T weight={500} size={17} line={21}>
                  {format(m.kg)} {unit}
                </T>
                <Body size={11}>{m.reached ? 'Reached' : 'Upcoming'}</Body>
              </View>
            ))}
          </View>
        </Card>
      )}
      {weeks.length > 1 && (
        <Card padding={20} style={{ marginTop: 20 }}>
          <H2 size={16}>Weekly averages</H2>
          <Body size={12} style={{ marginTop: 6 }}>
            Monday to Sunday. The current week uses the readings logged so far.
          </Body>
          <View style={{ marginTop: 14, gap: 10 }}>
            {weeks.slice(0, 8).map((w) => (
              <View key={w.week} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Body size={13} style={{ flex: 1 }}>
                  Week of {dateLabel(w.week)}
                </Body>
                <T weight={500} size={14} line={18}>
                  {format(w.averageKg)} {unit}
                </T>
                <Body size={13} style={{ width: 84, textAlign: 'right' }}>
                  {signedKg(w.changeKg, unit)}
                </Body>
              </View>
            ))}
          </View>
        </Card>
      )}
      <SectionTitle
        title="Weigh-in history"
        count={data.weights.length}
        right={<TextButton label="Add entry" size={12} icon={<Plus size={16} color={theme.textButton} />} onPress={() => openWeight()} />}
      />
      <View style={{ gap: 8 }}>
        {[...data.weights].reverse().map((w) => (
          <View
            key={w.date}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.surface, borderRadius: 18, padding: 13 }}
          >
            <DateTile iso={w.date} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <T weight={500} size={18} line={22} tracking={-0.45}>
                {format(w.kg)}{' '}
                <T size={12} color={theme.muted}>
                  {unit}
                </T>
              </T>
              <Body size={11}>
                {w.note || new Date(w.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric' })}
              </Body>
            </View>
            <IconButton icon={<Pencil size={17} color={theme.muted} />} accessibilityLabel={`Edit weigh-in ${w.date}`} size={40} onPress={() => openWeight(w)} />
            <IconButton icon={<Trash2 size={17} color={theme.muted} />} accessibilityLabel={`Delete weigh-in ${w.date}`} size={40} onPress={() => setRemove(w.date)} />
          </View>
        ))}
        {!data.weights.length && (
          <Body size={14} style={{ paddingVertical: 25 }}>
            Your weigh-ins will be collected here.
          </Body>
        )}
      </View>
      <Sheet
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === 'goal' ? 'Set goal' : editing ? 'Edit weigh-in' : 'Log weight'}
        description={modal === 'goal' ? 'Enter a goal weight.' : 'Daily fluctuations are normal. The trend tells the story.'}
      >
        <Field label={`${modal === 'goal' ? 'Goal weight' : 'Weight'} (${unit})`}>
          <Input
            large
            accessibilityLabel={`${modal === 'goal' ? 'Goal weight' : 'Weight'} (${unit})`}
            keyboardType="decimal-pad"
            inputMode="decimal"
            value={value}
            onChangeText={setValue}
            placeholder={unit === 'kg' ? '75.0' : '165.0'}
          />
        </Field>
        {modal === 'weight' && (
          <>
            <Field label="Date" hint="YYYY-MM-DD">
              <Input accessibilityLabel="Date" value={date} onChangeText={setDate} maxLength={10} placeholder={today()} />
            </Field>
            <Field label="Note" hint="optional">
              <Input accessibilityLabel="Note" value={note} onChangeText={setNote} maxLength={500} placeholder="Anything worth remembering?" />
            </Field>
          </>
        )}
        {!!formError && (
          <T size={13} line={18} color={theme.errorText} style={{ marginTop: 14 }} accessibilityRole="alert">
            {formError}
          </T>
        )}
        <View style={{ marginTop: 22, gap: 6 }}>
          <PrimaryButton
            full
            label={modal === 'goal' ? 'Save goal' : 'Save weigh-in'}
            icon={<Plus size={19} color={theme.primaryText} />}
            disabled={busy}
            onPress={() => {
              if (modal === 'weight') {
                saveWeight();
                return;
              }
              const kg = toKg(Number(value), unit);
              if (!value.trim() || !Number.isFinite(kg) || kg < 20 || kg > 500) {
                setFormError('Enter a goal between 20 and 500 kg (or its equivalent).');
                return;
              }
              act(() => update((d) => ({ ...d, goal: kg })), 'Goal saved.');
              setModal(null);
            }}
          />
          {modal === 'goal' && data.goal !== null && (
            <TextButton
              label="Remove goal"
              onPress={() => {
                act(() => update((d) => ({ ...d, goal: null })));
                setModal(null);
              }}
            />
          )}
        </View>
      </Sheet>
      <Sheet
        open={!!remove}
        onClose={() => setRemove(null)}
        title="Delete this weigh-in?"
        description={`This removes the ${remove ? dateLabel(remove, true) : ''} entry and recalculates your trend.`}
      >
        <View style={{ marginTop: 18 }}>
          <DangerButton
            label="Delete weigh-in"
            onPress={() => {
              const target = remove;
              setRemove(null);
              if (target) act(() => update((d) => ({ ...d, weights: d.weights.filter((w) => w.date !== target) })));
            }}
          />
        </View>
      </Sheet>
    </>
  );
}
