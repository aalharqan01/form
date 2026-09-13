import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import {
  ArrowUpRight,
  Bookmark,
  ChartNoAxesCombined,
  Check,
  Dumbbell,
  Pencil,
  Play,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { randomUUID } from 'expo-crypto';
import {
  STARTERS,
  completedSets,
  dateLabel,
  displayWeight,
  trendStats,
  volume,
  type Routine,
  type Workout,
} from '../../../lib/fitness';
import type { Training } from '../use-training';
import { useTheme } from '../theme';
import {
  Bezel,
  Body,
  Card,
  DangerButton,
  Disclosure,
  Eyebrow,
  H2,
  H3,
  IconButton,
  PageHeading,
  Press,
  PrimaryButton,
  SectionLabel,
  SectionTitle,
  Sheet,
  T,
  TextButton,
} from '../ui';
import { AssignedWorkouts } from './assigned';
import { StepsCard } from './steps';
import { RoutineEditor } from './routine-editor';
import { WorkoutDetailSheet } from './history';
import type { Act } from './shared';

/** Loaded barbell sleeve: three plates on a bar, the strength mark of the next-session card. */
function PlateStack({ color }: { color: string }) {
  return (
    <Svg
      width={92}
      height={64}
      viewBox="0 0 92 64"
      accessibilityLabel="Loaded barbell"
    >
      <Path
        d="M0 32h14M78 32h14"
        stroke={color}
        strokeWidth={5}
        strokeLinecap="round"
      />
      <Path d="M14 30h8v4h-8z" fill={color} opacity={0.9} />
      <Path d="M70 30h8v4h-8z" fill={color} opacity={0.9} />
      <Path
        d="M22 8h12a3 3 0 0 1 3 3v42a3 3 0 0 1-3 3H22a3 3 0 0 1-3-3V11a3 3 0 0 1 3-3z"
        fill={color}
      />
      <Path
        d="M38 16h10a3 3 0 0 1 3 3v26a3 3 0 0 1-3 3H38a3 3 0 0 1-3-3V19a3 3 0 0 1 3-3z"
        fill={color}
        opacity={0.72}
      />
      <Path
        d="M58 8h12a3 3 0 0 1 3 3v42a3 3 0 0 1-3 3H58a3 3 0 0 1-3-3V11a3 3 0 0 1 3-3z"
        fill={color}
      />
      <Path
        d="M44 16h10a3 3 0 0 1 3 3v26a3 3 0 0 1-3 3H44a3 3 0 0 1-3-3V19a3 3 0 0 1 3-3z"
        fill={color}
        opacity={0.72}
      />
    </Svg>
  );
}

export function TrainScreen({
  training,
  act,
  busy,
  onStart,
  onRepeat,
  navigate,
}: {
  training: Training;
  act: Act;
  busy: boolean;
  onStart: (routine: Routine | null, membershipId?: string) => void;
  onRepeat: (workout: Workout) => void;
  navigate: (tab: 'weight' | 'you') => void;
}) {
  const { theme } = useTheme();
  const { data, update } = training;
  const [editor, setEditor] = useState<{ routine: Routine | null } | null>(
      null,
    ),
    [remove, setRemove] = useState<Routine | null>(null),
    [detail, setDetail] = useState<Workout | null>(null);
  const stats = trendStats(data.weights, data.goal);
  const lastWorkout = data.workouts.at(-1);
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekly = data.workouts.filter(
    (w) => new Date(w.startedAt) >= weekStart,
  );
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const next = data.routines[0];
  const nextSets = next ? next.exercises.reduce((a, e) => a + e.sets, 0) : 0;
  // Roughly 40 s of work per set plus the rest target.
  const nextMinutes = next
    ? Math.max(
        5,
        Math.round(
          next.exercises.reduce(
            (a, e) => a + e.sets * ((e.restSeconds ?? 90) + 40),
            0,
          ) /
            60 /
            5,
        ) * 5,
      )
    : 0;
  const nextMuscles = next
    ? [...new Set(next.exercises.map((e) => e.muscle))].slice(0, 4)
    : [];
  const spark = stats.points.slice(-30);
  const lo = Math.min(...spark.map((x) => x.trend)) - 0.1,
    hi = Math.max(...spark.map((x) => x.trend)) + 0.1;
  const sparkPath = spark
    .map(
      (v, i) =>
        `${i ? 'L' : 'M'}${spark.length === 1 ? 120 : (i / (spark.length - 1)) * 240},${7 + ((hi - v.trend) / (hi - lo)) * 50}`,
    )
    .join(' ');
  return (
    <>
      <PageHeading eyebrow="TRAINING" first="Your" second="training." />
      <AssignedWorkouts training={training} busy={busy} onStart={onStart} />
      <View style={{ gap: 16 }}>
        <Bezel>
          <Card background={theme.feature}>
            <SectionLabel
              style={{ marginBottom: 25 }}
              right={
                <View
                  style={{
                    paddingVertical: 5,
                    paddingHorizontal: 9,
                    borderRadius: 30,
                    backgroundColor: theme.featurePill,
                  }}
                >
                  <T
                    weight={600}
                    size={10}
                    line={12}
                    tracking={0.8}
                    color={theme.featureLabel}
                  >
                    STRENGTH
                  </T>
                </View>
              }
            >
              YOUR NEXT SESSION
            </SectionLabel>
            <View
              style={{ flexDirection: 'row', alignItems: 'center', gap: 20 }}
            >
              <T
                weight={500}
                size={30}
                line={33}
                tracking={-1.65}
                style={{ flex: 1 }}
              >
                {next ? next.name : 'Start a workout.'}
              </T>
              <PlateStack color={theme.featureSymbol} />
            </View>
            <Body size={14} color={theme.featureText} style={{ marginTop: 14 }}>
              {next
                ? `${next.exercises.length} exercises · ${nextSets} sets · about ${nextMinutes} min`
                : 'Build a plan that works for you.\nKeep every set in one place.'}
            </Body>
            {nextMuscles.length > 0 && (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginTop: 14,
                }}
              >
                {nextMuscles.map((m) => (
                  <View
                    key={m}
                    style={{
                      paddingVertical: 5,
                      paddingHorizontal: 10,
                      borderRadius: 30,
                      backgroundColor: theme.featurePill,
                    }}
                  >
                    <T
                      weight={500}
                      size={11}
                      line={13}
                      color={theme.featureLabel}
                    >
                      {m}
                    </T>
                  </View>
                ))}
              </View>
            )}
            <View style={{ marginTop: 30, marginBottom: 4 }}>
              <PrimaryButton
                full
                label="Start workout"
                icon={
                  <ArrowUpRight
                    size={22}
                    strokeWidth={1.6}
                    color={theme.primaryText}
                  />
                }
                disabled={busy}
                onPress={() => onStart(next ?? null)}
              />
            </View>
          </Card>
        </Bezel>
        <Bezel>
          <Card>
            <SectionLabel
              style={{ marginBottom: 16 }}
              right={
                <ChartNoAxesCombined
                  size={18}
                  strokeWidth={1.4}
                  color={theme.featureLabel}
                />
              }
            >
              BODY WEIGHT
            </SectionLabel>
            {stats.latest ? (
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}
              >
                <View style={{ flex: 1 }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'baseline',
                      gap: 9,
                    }}
                  >
                    <T weight={500} size={45} line={48} tracking={-3.4}>
                      {displayWeight(stats.latest.trend, data.unit).toFixed(1)}
                    </T>
                    <T size={17} color={theme.placeholder}>
                      {data.unit}
                    </T>
                  </View>
                  <Body size={12}>Smoothed weight</Body>
                </View>
                <Svg
                  width={120}
                  height={58}
                  viewBox="0 0 240 65"
                  accessibilityLabel="Smoothed weight trend"
                >
                  <Path
                    d={sparkPath}
                    fill="none"
                    stroke={theme.sparkline}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
            ) : (
              <View>
                <T weight={500} size={29} line={33} tracking={-1.2}>
                  Weight tracker
                </T>
                <Body size={12} style={{ marginTop: 6 }}>
                  Log your body weight.
                </Body>
              </View>
            )}
            <View
              style={{
                borderTopWidth: 1,
                borderColor: theme.line,
                marginTop: 12,
                paddingTop: 4,
              }}
            >
              <TextButton
                label={stats.latest ? 'See your progress' : 'Log your weight'}
                size={13}
                onPress={() => navigate('weight')}
                style={{
                  alignSelf: 'stretch',
                  justifyContent: 'space-between',
                  minHeight: 38,
                }}
                icon={undefined}
              />
              <View
                style={{
                  position: 'absolute',
                  right: 0,
                  top: 12,
                  pointerEvents: 'none',
                }}
              >
                <ArrowUpRight size={18} color={theme.textButton} />
              </View>
            </View>
          </Card>
        </Bezel>
        <Bezel>
          <StepsCard training={training} act={act} busy={busy} />
        </Bezel>
      </View>
      <View style={{ paddingVertical: 24, paddingHorizontal: 4, gap: 18 }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Eyebrow size={9}>THIS WEEK</Eyebrow>
          <T weight={500} size={16} line={20} tracking={-0.5}>
            {weekly.length} {weekly.length === 1 ? 'session' : 'sessions'}{' '}
            <T size={16} color={theme.headingSpan}>
              and counting.
            </T>
          </T>
        </View>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 7,
          }}
        >
          {weekDays.map((date, i) => {
            const has = data.workouts.some(
                (w) =>
                  new Date(w.startedAt).toDateString() === date.toDateString(),
              ),
              isToday = date.toDateString() === new Date().toDateString();
            return (
              <View key={i} style={{ alignItems: 'center', gap: 8 }}>
                <T
                  weight={isToday ? 700 : 400}
                  size={11}
                  line={14}
                  color={isToday ? theme.green : theme.chipText}
                >
                  {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                </T>
                <View
                  accessibilityLabel={`${date.toLocaleDateString()}: ${has ? 'workout completed' : 'no workout'}`}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    borderWidth: isToday ? 1 : 0,
                    borderColor: '#799169',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: has ? theme.trained : theme.chip,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {has ? (
                      <Check
                        size={15}
                        color={
                          theme.scheme === 'dark' ? theme.background : '#fff'
                        }
                      />
                    ) : (
                      <T size={12} line={14} color={theme.chipText}>
                        {date.getDate()}
                      </T>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </View>
      <SectionTitle
        title="Your plans"
        count={data.routines.length}
        style={{ marginTop: 0 }}
        right={
          <TextButton
            label="Create plan"
            size={12}
            icon={<Plus size={17} color={theme.textButton} />}
            disabled={data.routines.length >= 100}
            onPress={() => setEditor({ routine: null })}
          />
        }
      />
      <View style={{ gap: 10 }}>
        {data.routines.map((r, i) => (
          <View
            key={r.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 16,
              backgroundColor: theme.surface,
              borderRadius: 22,
              gap: 10,
            }}
          >
            <View
              style={{
                width: 46,
                height: 46,
                borderRadius: 15,
                backgroundColor: theme.routineMark,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <T size={17} color={theme.routineMarkText}>
                {String(i + 1).padStart(2, '0')}
              </T>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <H3 size={16}>{r.name}</H3>
              <Body size={12} style={{ marginTop: 3 }}>
                {r.exercises.length} exercises ·{' '}
                {r.exercises.reduce((a, e) => a + e.sets, 0)} sets
              </Body>
            </View>
            <IconButton
              icon={<Pencil size={15} color={theme.muted} />}
              accessibilityLabel={`Edit ${r.name}`}
              size={38}
              onPress={() => setEditor({ routine: r })}
            />
            <IconButton
              icon={<Trash2 size={15} color={theme.muted} />}
              accessibilityLabel={`Delete ${r.name}`}
              size={38}
              onPress={() => setRemove(r)}
            />
            <Press
              accessibilityRole="button"
              accessibilityLabel={`Start ${r.name}`}
              disabled={busy}
              onPress={() => onStart(r)}
              scale={0.9}
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor:
                  theme.scheme === 'dark' ? theme.soft : '#edf2e4',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Play
                size={17}
                color={theme.scheme === 'dark' ? theme.green : '#496738'}
                fill={theme.scheme === 'dark' ? theme.green : '#496738'}
              />
            </Press>
          </View>
        ))}
        {!data.routines.length && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 17,
              padding: 21,
              backgroundColor: theme.surface,
              borderRadius: 22,
            }}
          >
            <View
              style={{
                width: 62,
                height: 62,
                borderRadius: 17,
                backgroundColor: theme.routineMark,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bookmark
                size={25}
                strokeWidth={1.3}
                color={theme.routineMarkText}
              />
            </View>
            <View style={{ flex: 1 }}>
              <H3>No plans yet</H3>
              <Body size={14} style={{ marginTop: 6 }}>
                Add your exercises, set targets, and make it repeatable.
              </Body>
            </View>
          </View>
        )}
      </View>
      <Disclosure summary="Need a starting point?" style={{ marginTop: 20 }}>
        <Body size={13} style={{ paddingBottom: 10 }}>
          Starter plans to adapt. Change the exercises and targets to suit you.
        </Body>
        <View style={{ gap: 12 }}>
          {STARTERS.map((r) => (
            <Press
              key={r.id}
              accessibilityRole="button"
              accessibilityLabel={`Use starter ${r.name}`}
              onPress={() => setEditor({ routine: { ...r, id: randomUUID() } })}
              scale={0.985}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 15,
                backgroundColor:
                  theme.scheme === 'dark' ? theme.soft : '#ecefe6',
                padding: 19,
                borderRadius: 18,
              }}
            >
              <Dumbbell
                size={20}
                strokeWidth={1.4}
                color={theme.secondaryText}
              />
              <View style={{ flex: 1 }}>
                <T weight={500} size={14} line={18} color={theme.secondaryText}>
                  {r.name}
                </T>
                <T
                  size={12}
                  line={16}
                  color={theme.muted}
                  style={{ marginTop: 3 }}
                >
                  {r.exercises.length} exercises
                </T>
              </View>
              <Plus size={18} color={theme.secondaryText} />
            </Press>
          ))}
        </View>
      </Disclosure>
      {lastWorkout && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 18,
            marginTop: 27,
            paddingTop: 25,
            borderTopWidth: 1,
            borderColor: theme.line,
          }}
        >
          <View style={{ flex: 1 }}>
            <Eyebrow size={9} style={{ marginBottom: 9 }}>
              LAST SESSION
            </Eyebrow>
            <H3>{lastWorkout.name}</H3>
            <Body size={12} style={{ marginTop: 4 }}>
              {dateLabel(lastWorkout.startedAt, true)} ·{' '}
              {completedSets(lastWorkout)} sets ·{' '}
              {volume(lastWorkout).toLocaleString()} kg
              {lastWorkout.endedEarly ? ' · Finished early' : ''}
            </Body>
          </View>
          <TextButton
            label="View session"
            size={12}
            icon={<ArrowUpRight size={16} color={theme.textButton} />}
            onPress={() => setDetail(lastWorkout)}
          />
        </View>
      )}
      {editor && (
        <RoutineEditor
          open
          routine={editor.routine}
          onClose={() => setEditor(null)}
          onSave={(r) =>
            act(
              () =>
                update((d) => ({
                  ...d,
                  routines: d.routines.some((v) => v.id === r.id)
                    ? d.routines.map((v) => (v.id === r.id ? r : v))
                    : [...d.routines, r],
                })),
              'Plan saved.',
            )
          }
        />
      )}
      <Sheet
        open={!!remove}
        onClose={() => setRemove(null)}
        title="Delete this plan?"
        description="Your completed workouts will be kept."
      >
        <View style={{ marginTop: 18 }}>
          <DangerButton
            label="Delete plan"
            onPress={() => {
              const target = remove;
              setRemove(null);
              if (target)
                act(() =>
                  update((d) => ({
                    ...d,
                    routines: d.routines.filter((r) => r.id !== target.id),
                  })),
                );
            }}
          />
        </View>
      </Sheet>
      <WorkoutDetailSheet
        workout={detail}
        unit={data.unit}
        onClose={() => setDetail(null)}
        onRepeat={(w) => {
          setDetail(null);
          onRepeat(w);
        }}
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
    </>
  );
}
