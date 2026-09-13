import { useRef, useState } from 'react';
import { Platform, Share, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import {
  ArrowUpRight,
  ChevronRight,
  Flame,
  History,
  Plus,
  Trophy,
} from 'lucide-react-native';
import {
  completedSets,
  dateLabel,
  displayWeight,
  exerciseHistory,
  volume,
  weeklySessionCounts,
  weeklyStreak,
  type Workout,
} from '../../../lib/fitness';
import type { Training } from '../use-training';
import { useTheme } from '../theme';
import {
  Body,
  Card,
  DateTile,
  H2,
  H3,
  PageHeading,
  Press,
  PrimaryButton,
  SectionTitle,
  Segmented,
  T,
  TextButton,
} from '../ui';
import { Wordmark } from '../wordmark';
import { minutesOf, skippedSets, type Act } from './shared';
import { ExerciseProgressSheet, WorkoutDetailSheet } from './history';

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]!.toUpperCase())
    .join('') || 'ME';

/** A plain-text summary for sharing a session anywhere. */
export function workoutSummary(w: Workout, unit: 'kg' | 'lb') {
  const best = (e: Workout['exercises'][number]) => {
    const done = e.sets.filter((s) => s.done && Number(s.kg) > 0);
    if (!done.length) return null;
    const top = done.reduce((a, b) => (Number(b.kg) > Number(a.kg) ? b : a));
    return `${displayWeight(Number(top.kg), e.unit ?? unit).toLocaleString(undefined, { maximumFractionDigits: 1 })} ${e.unit ?? unit} × ${top.reps}`;
  };
  const lines = w.exercises.map((e) => {
    const b = best(e);
    return `• ${e.name}${b ? ` — ${b}` : ''}`;
  });
  return [
    `${w.name} · ${dateLabel(w.startedAt, true)}`,
    `${completedSets(w)} sets · ${volume(w).toLocaleString()} kg · ${minutesOf(w)} min`,
    ...lines,
    'Logged with FORM',
  ].join('\n');
}

/** The image people share: a compact card with the session's numbers. */
function ShareCard({
  workout,
  unit,
  cardRef,
}: {
  workout: Workout;
  unit: 'kg' | 'lb';
  cardRef: React.RefObject<View | null>;
}) {
  const { theme } = useTheme();
  const top = workout.exercises.slice(0, 5);
  return (
    <View
      ref={cardRef}
      collapsable={false}
      style={{
        width: 360,
        padding: 28,
        backgroundColor: theme.feature,
        borderRadius: 28,
        gap: 6,
      }}
    >
      <Wordmark height={18} />
      <T
        weight={500}
        size={30}
        line={34}
        tracking={-1.5}
        style={{ marginTop: 18 }}
      >
        {workout.name}
      </T>
      <Body size={13} color={theme.featureText}>
        {dateLabel(workout.startedAt, true)}
      </Body>
      <View style={{ flexDirection: 'row', gap: 18, marginTop: 16 }}>
        {(
          [
            [String(completedSets(workout)), 'sets'],
            [volume(workout).toLocaleString(), 'kg'],
            [String(minutesOf(workout)), 'min'],
          ] as const
        ).map(([value, label]) => (
          <View key={label}>
            <T weight={500} size={26} line={30} tracking={-1}>
              {value}
            </T>
            <Body size={12} color={theme.featureText}>
              {label}
            </Body>
          </View>
        ))}
      </View>
      <View style={{ marginTop: 16, gap: 6 }}>
        {top.map((e) => {
          const done = e.sets.filter((s) => s.done);
          return (
            <View
              key={e.id}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 12,
              }}
            >
              <T size={14} line={18} style={{ flex: 1 }} numberOfLines={1}>
                {e.name}
              </T>
              <Body size={13} color={theme.featureText}>
                {done.length} × {done[0]?.reps ?? '—'}
              </Body>
            </View>
          );
        })}
        {workout.exercises.length > top.length && (
          <Body size={12} color={theme.featureText}>
            +{workout.exercises.length - top.length} more
          </Body>
        )}
      </View>
    </View>
  );
}

function WeeklyBars({
  counts,
  unit,
}: {
  counts: { week: string; count: number }[];
  unit: string;
}) {
  const { theme } = useTheme();
  const max = Math.max(3, ...counts.map((c) => c.count));
  const width = 280,
    height = 90,
    gap = 8,
    bar = (width - gap * (counts.length - 1)) / counts.length;
  return (
    <View accessibilityLabel={`Sessions per week, last ${counts.length} weeks`}>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {counts.map((c, i) => {
          const h = c.count ? Math.max(6, (c.count / max) * (height - 22)) : 4;
          const last = i === counts.length - 1;
          return (
            <Rect
              key={c.week}
              x={i * (bar + gap)}
              y={height - 18 - h}
              width={bar}
              height={h}
              rx={Math.min(6, bar / 2)}
              fill={last ? theme.green : c.count ? theme.sparkline : theme.line}
              opacity={last ? 1 : 0.7}
            />
          );
        })}
      </Svg>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginTop: 2,
        }}
      >
        <Body size={11}>{counts.length} weeks ago</Body>
        <Body size={11}>{unit}</Body>
        <Body size={11}>This week</Body>
      </View>
    </View>
  );
}

export function YouScreen({
  training,
  act,
  busy,
  onStart,
  onRepeat,
}: {
  training: Training;
  act: Act;
  busy: boolean;
  onStart: () => void;
  onRepeat: (workout: Workout) => void;
}) {
  const { theme } = useTheme();
  const { data, update } = training;
  const [detail, setDetail] = useState<Workout | null>(null),
    [progress, setProgress] = useState<string | null>(null),
    [view, setView] = useState<'workouts' | 'exercises'>('workouts'),
    [sharing, setSharing] = useState<Workout | null>(null);
  const cardRef = useRef<View | null>(null);
  const names = [
    ...new Set(data.workouts.flatMap((w) => w.exercises.map((e) => e.name))),
  ].sort();
  const workouts = [...data.workouts].sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt),
  );
  const counts = weeklySessionCounts(data.workouts, 8);
  const streak = weeklyStreak(data.workouts);
  const first = data.workouts.map((w) => w.startedAt).sort()[0];
  const name = training.name || 'You';
  const share = (w: Workout) => {
    const text = workoutSummary(w, data.unit);
    const web = Platform.OS === 'web' && typeof navigator !== 'undefined';
    if (web && !navigator.share) {
      // Browsers without the share sheet get the summary on the clipboard.
      act(
        () => navigator.clipboard.writeText(text),
        'Copied the workout summary. Paste it anywhere.',
      );
      return;
    }
    setSharing(w);
    act(async () => {
      // Give the card a frame to lay out before capturing it.
      await new Promise((r) => setTimeout(r, 80));
      try {
        if (web) {
          await navigator.share({ title: w.name, text });
          return;
        }
        if (cardRef.current && (await Sharing.isAvailableAsync())) {
          const uri = await captureRef(cardRef, {
            format: 'png',
            quality: 1,
            result: 'tmpfile',
          });
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: 'Share workout',
          });
          return;
        }
        await Share.share({ message: text, title: w.name });
      } finally {
        setSharing(null);
      }
    });
  };
  return (
    <>
      <PageHeading eyebrow="YOU" first="Your" second="journey." />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 14,
          marginBottom: 18,
        }}
      >
        <View
          accessibilityLabel={`Initials ${initialsOf(name)}`}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: theme.feature,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <T weight={600} size={18} line={22} color={theme.featureSymbol}>
            {initialsOf(name)}
          </T>
        </View>
        <View style={{ flex: 1 }}>
          <H2 size={22}>{name}</H2>
          <Body size={13} style={{ marginTop: 2 }}>
            {first
              ? `Training since ${dateLabel(first, true)}`
              : 'No workouts yet'}
            {streak > 1 ? ` · ${streak}-week streak` : ''}
          </Body>
        </View>
        {streak > 1 && <Flame size={22} color={theme.green} />}
      </View>
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: theme.summary,
          borderRadius: 21,
          paddingVertical: 22,
          paddingHorizontal: 18,
          gap: 12,
        }}
      >
        {(
          [
            ['WORKOUTS', String(data.workouts.length), ''],
            ['THIS WEEK', String(counts.at(-1)?.count ?? 0), ''],
            ['STREAK', String(streak), streak === 1 ? ' wk' : ' wks'],
            [
              'VOLUME',
              (data.workouts.reduce((a, w) => a + volume(w), 0) / 1000).toFixed(
                1,
              ),
              ' t',
            ],
          ] as const
        ).map(([label, value, suffix]) => (
          <View key={label} style={{ flex: 1 }}>
            <T
              size={10}
              line={14}
              color={theme.routineMarkText}
              style={{ marginBottom: 10 }}
            >
              {label}
            </T>
            <T weight={500} size={26} line={30} tracking={-1.4}>
              {value}
              {suffix ? (
                <T size={13} color={theme.routineMarkText}>
                  {suffix}
                </T>
              ) : null}
            </T>
          </View>
        ))}
      </View>
      <Card style={{ marginTop: 14 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 14,
          }}
        >
          <H3 size={16}>Sessions per week</H3>
          <Body size={12}>
            {counts.reduce((a, c) => a + c.count, 0)} in 8 weeks
          </Body>
        </View>
        <WeeklyBars counts={counts} unit="" />
      </Card>
      <View style={{ marginTop: 22, marginBottom: 12 }}>
        <Segmented
          options={[
            { value: 'workouts', label: 'Workouts' },
            { value: 'exercises', label: 'Exercises' },
          ]}
          value={view}
          onChange={setView}
          style={{ alignSelf: 'flex-start', minWidth: 220 }}
        />
      </View>
      {view === 'exercises' ? (
        !names.length ? (
          <Body size={14} style={{ paddingVertical: 10 }}>
            Complete a workout to see exercise trends and personal records.
          </Body>
        ) : (
          <View style={{ gap: 10 }}>
            {names.map((n) => {
              const p = exerciseHistory(data.workouts, n),
                last = p.at(-1);
              return (
                <Press
                  key={n}
                  accessibilityRole="button"
                  accessibilityLabel={`Progress for ${n}`}
                  onPress={() => setProgress(n)}
                  scale={0.985}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    padding: 20,
                    borderRadius: 17,
                    backgroundColor: theme.surface,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <T weight={500} size={14} line={18}>
                      {n}
                    </T>
                    <Body size={12} style={{ marginTop: 5 }}>
                      {p.length} sessions
                    </Body>
                  </View>
                  {last?.record && (
                    <Trophy size={17} color={theme.textButton} />
                  )}
                  <ChevronRight size={18} color={theme.muted} />
                </Press>
              );
            })}
          </View>
        )
      ) : (
        <>
          <SectionTitle
            title="Workouts"
            right={
              <TextButton
                label={data.active ? 'Resume' : 'New workout'}
                size={12}
                icon={<Plus size={16} color={theme.textButton} />}
                disabled={busy}
                onPress={onStart}
              />
            }
          />
          {!workouts.length ? (
            <Card
              style={{ alignItems: 'center', paddingVertical: 55, gap: 14 }}
            >
              <History
                size={38}
                strokeWidth={1.2}
                color={theme.routineMarkText}
              />
              <H2 size={24}>No workouts yet</H2>
              <Body size={14} center>
                Finish your first workout to start your journey.
              </Body>
              <View style={{ marginTop: 10 }}>
                <PrimaryButton
                  label="Start workout"
                  icon={<ArrowUpRight size={20} color={theme.primaryText} />}
                  onPress={onStart}
                />
              </View>
            </Card>
          ) : (
            <View style={{ gap: 10 }}>
              {workouts.map((w) => (
                <Press
                  key={w.id}
                  accessibilityRole="button"
                  accessibilityLabel={`View ${w.name}, ${dateLabel(w.startedAt, true)}`}
                  onPress={() => setDetail(w)}
                  scale={0.985}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    backgroundColor: theme.surface,
                    borderRadius: 18,
                    paddingVertical: 16,
                    paddingHorizontal: 13,
                  }}
                >
                  <DateTile iso={w.startedAt} size={42} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <H3 size={16}>{w.name}</H3>
                    <Body size={12} style={{ marginTop: 4 }}>
                      {w.exercises.length} exercises · {completedSets(w)} sets
                    </Body>
                    {w.endedEarly && (
                      <Body size={12} color={theme.amberText}>
                        {`Finished early · ${skippedSets(w)} skipped ${skippedSets(w) === 1 ? 'set' : 'sets'}`}
                      </Body>
                    )}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <T weight={500} size={13} line={17}>
                      {volume(w).toLocaleString()} kg
                    </T>
                    <Body size={10}>{minutesOf(w)} min</Body>
                  </View>
                  <ChevronRight size={13} color={theme.muted} />
                </Press>
              ))}
            </View>
          )}
        </>
      )}
      <WorkoutDetailSheet
        workout={detail}
        unit={data.unit}
        onClose={() => setDetail(null)}
        onRepeat={(w) => {
          setDetail(null);
          onRepeat(w);
        }}
        onShare={share}
        onDelete={(w) =>
          act(() => {
            setDetail(null);
            return update((d) => ({
              ...d,
              workouts: d.workouts.filter((v) => v.id !== w.id),
            }));
          }, 'Workout deleted.')
        }
      />
      <ExerciseProgressSheet
        name={progress}
        data={data}
        onClose={() => setProgress(null)}
      />
      {sharing && (
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: -1000, top: 0 }}
        >
          <ShareCard workout={sharing} unit={data.unit} cardRef={cardRef} />
        </View>
      )}
    </>
  );
}
