import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import {
  Bookmark,
  Check,
  Dumbbell,
  Pause,
  Play,
  Plus,
  X,
} from 'lucide-react-native';
import { randomUUID } from 'expo-crypto';
import { exerciseDetail } from '../../../lib/exercises';
import { ExerciseGuideSheet } from './exercise-guide';
import {
  pauseWorkout,
  resumeWorkout,
  workoutSeconds,
  completedSets,
  displayWeight,
  lastPerformance,
  volume,
  type Exercise,
  type LiftSet,
  type Workout,
} from '../../../lib/fitness';
import { changeExerciseUnit, routineFromWorkout } from '../../../lib/training';
import {
  editWorkoutSet,
  finishAssignedWorkout,
} from '../../../lib/mobile-workout';
import type { Training } from '../use-training';
import type { Rest } from '../use-rest';
import { font, useTheme } from '../theme';
import { useI18n } from '../i18n';
import {
  Bezel,
  Body,
  Card,
  Chip,
  DangerButton,
  Disclosure,
  ErrorBanner,
  Eyebrow,
  Field,
  IconButton,
  Input,
  Press,
  PrimaryButton,
  Reveal,
  SecondaryButton,
  Segmented,
  Sheet,
  T,
  TextButton,
  Thumbnail,
} from '../ui';
import { DemoVideo } from '../components/demo-video';
import { ExercisePicker } from './exercise-picker';
import { RoutineEditor } from './routine-editor';
import { duration, loadValue, restLabel, type Act } from './shared';

const REST_PRESETS = [0, 30, 45, 60, 90, 120, 180, 240, 300];
const native = Platform.OS !== 'web';

function CheckButton({
  done,
  busy,
  label,
  onPress,
}: {
  done: boolean;
  busy: boolean;
  label: string;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const scale = useRef(new Animated.Value(1)).current;
  const ring = useRef(new Animated.Value(0)).current;
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    if (!done) return;
    ring.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 0.86,
          duration: 70,
          easing: Easing.out(Easing.quad),
          useNativeDriver: native,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 4,
          tension: 180,
          useNativeDriver: native,
        }),
      ]),
      Animated.timing(ring, {
        toValue: 1,
        duration: 420,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: native,
      }),
    ]).start();
  }, [done, scale, ring]);
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked: done, disabled: busy }}
      aria-checked={done}
      disabled={busy}
      onPress={onPress}
      style={{
        width: 43,
        height: 52,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          width: 43,
          height: 52,
          borderRadius: 15,
          borderWidth: 2,
          borderColor: theme.checkDone,
          opacity: ring.interpolate({
            inputRange: [0, 0.2, 1],
            outputRange: [0, 0.6, 0],
          }),
          transform: [
            {
              scale: ring.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.55],
              }),
            },
          ],
        }}
      />
      <Animated.View
        style={{
          width: 43,
          height: 52,
          borderRadius: 15,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: done ? theme.checkDone : theme.checkIdle,
          transform: [{ scale }],
        }}
      >
        <Check
          size={20}
          strokeWidth={done ? 2.4 : 2}
          color={done ? theme.primaryText : theme.checkIdleText}
        />
      </Animated.View>
    </Pressable>
  );
}

function Stepper({
  value,
  label,
  step,
  done,
  onChange,
  keyboard,
}: {
  value: string;
  label: string;
  step: string;
  done: boolean;
  onChange: (value: string) => void;
  keyboard: 'decimal-pad' | 'number-pad';
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const bump = (delta: number) => {
    const next = Math.max(0, Number(value || 0) + delta);
    onChange(String(Number(next.toFixed(2))));
  };
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: done ? theme.setDone : theme.soft,
        borderWidth: 1,
        borderColor: done ? '#759764' : 'transparent',
      }}
    >
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboard}
        inputMode={keyboard === 'decimal-pad' ? 'decimal' : 'numeric'}
        value={value}
        placeholder="0"
        placeholderTextColor={theme.placeholder}
        maxLength={keyboard === 'decimal-pad' ? 8 : 4}
        selectTextOnFocus
        onChangeText={onChange}
        style={[
          font(500),
          {
            height: 54,
            fontSize: 27,
            textAlign: 'center',
            color: done ? theme.setDoneText : theme.ink,
            paddingHorizontal: 4,
          },
        ]}
      />
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.stepperBar,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('workout.decrease', { label })}
          onPress={() => bump(-Number(step))}
          style={{
            flex: 1,
            height: 37,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <T size={20} line={24}>
            −
          </T>
        </Pressable>
        <T
          size={11}
          line={14}
          color={theme.muted}
          style={{ flex: 1, textAlign: 'center' }}
        >
          {step}
        </T>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('workout.increase', { label })}
          onPress={() => bump(Number(step))}
          style={{
            flex: 1,
            height: 37,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <T size={20} line={24}>
            +
          </T>
        </Pressable>
      </View>
    </View>
  );
}

function ExerciseCard({
  exercise,
  workouts,
  busy,
  rest,
  act,
  change,
  editSet,
  remove,
  onError,
}: {
  exercise: Exercise;
  workouts: Workout[];
  busy: boolean;
  rest: Rest;
  act: Act;
  change: (fn: (e: Exercise) => Exercise) => Promise<unknown>;
  editSet: (
    setId: string,
    patch: { load?: string; reps?: string; done?: boolean },
  ) => Promise<unknown>;
  remove: () => void;
  onError: (message: string) => void;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const unit = exercise.unit ?? 'kg';
  const previous = lastPerformance(workouts, exercise.name);
  const [restSheet, setRestSheet] = useState(false),
    [restDraft, setRestDraft] = useState(''),
    [demo, setDemo] = useState(false),
    [guide, setGuide] = useState<string | null>(null),
    [confirmRemove, setConfirmRemove] = useState<LiftSet | null>(null);
  const anyDone = exercise.sets.some((s) => s.done);
  const complete = (set: LiftSet) => {
    if (set.done) {
      act(() => editSet(set.id, { done: false }));
      return;
    }
    const kg = Number(set.kg);
    if (
      set.kg === '' ||
      !Number.isFinite(kg) ||
      kg < 0 ||
      kg > 1500 ||
      !Number.isInteger(Number(set.reps)) ||
      Number(set.reps) < 1 ||
      Number(set.reps) > 1000
    ) {
      onError(t('workout.setError'));
      return;
    }
    onError('');
    act(async () => {
      await editSet(set.id, { done: true });
      rest.start(exercise);
    });
  };
  const addSet = (kind: 'working' | 'warmup') => {
    const last = exercise.sets.filter((s) => s.kind !== 'warmup').at(-1);
    act(() =>
      change((e) => ({
        ...e,
        sets: [
          ...e.sets,
          {
            id: randomUUID(),
            kg: kind === 'warmup' ? '' : (last?.kg ?? ''),
            load: kind === 'warmup' ? '' : last ? loadValue(last, unit) : '',
            reps: last?.reps ?? '10',
            kind,
            done: false,
          },
        ],
      })),
    );
  };
  return (
    <Bezel tight>
      <Card padding={15} style={{ borderRadius: 19 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <Thumbnail name={exercise.name} />
          <View style={{ flex: 1, minWidth: 120 }}>
            <T weight={500} size={23} line={27} tracking={-0.8}>
              {exercise.name}
            </T>
            <Body size={11} style={{ marginTop: 3 }}>
              {exercise.muscle}
            </Body>
          </View>
          <Segmented
            compact
            accessibilityLabel={t('workout.unitFor', { name: exercise.name })}
            options={[
              { value: 'kg', label: 'kg' },
              { value: 'lb', label: 'lb' },
            ]}
            labelFor={(o) => `${exercise.name} ${o.label}`}
            value={unit}
            onChange={(next) =>
              act(() => change((e) => changeExerciseUnit(e, next)))
            }
          />
          <IconButton
            icon={<X size={18} color={theme.muted} />}
            accessibilityLabel={t('workout.remove', { name: exercise.name })}
            size={36}
            onPress={remove}
          />
        </View>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginTop: 14,
            flexWrap: 'wrap',
          }}
        >
          <Press
            accessibilityRole="button"
            accessibilityLabel={t('workout.restFor', { name: exercise.name })}
            onPress={() => {
              setRestDraft(String(exercise.restSeconds ?? 90));
              setRestSheet(true);
            }}
            scale={0.96}
            style={{
              minHeight: 40,
              paddingHorizontal: 12,
              borderRadius: 12,
              backgroundColor: theme.soft,
              justifyContent: 'center',
            }}
          >
            <T size={13} line={16} color={theme.textButton}>
              {t('workout.rest', { label: restLabel(exercise.restSeconds) })}
            </T>
          </Press>
          {!!exerciseDetail(exercise.name) && (
            <TextButton
              label={t('workout.howTo')}
              size={13}
              accessibilityLabel={t('workout.howToDo', { name: exercise.name })}
              onPress={() => setGuide(exercise.name)}
              style={{ minHeight: 40 }}
            />
          )}
          {!!exercise.videoUrl && (
            <TextButton
              label={demo ? t('workout.hideDemo') : t('workout.watchDemo')}
              size={13}
              accessibilityLabel={`${demo ? 'Hide' : 'Show'} ${exercise.name} demonstration`}
              onPress={() => setDemo(!demo)}
              style={{ minHeight: 40 }}
            />
          )}
        </View>
        {!!exercise.videoUrl && demo && (
          <View style={{ marginTop: 14 }}>
            <DemoVideo url={exercise.videoUrl} name={exercise.name} />
          </View>
        )}
        <ExerciseGuideSheet name={guide} onClose={() => setGuide(null)} />
        {previous?.length ? (
          <View style={{ marginTop: 14 }}>
            <Body size={12}>
              {t('workout.lastTime')}{' '}
              {previous
                .map(
                  (s) =>
                    `${displayWeight(Number(s.kg), unit).toLocaleString(undefined, { maximumFractionDigits: 2 })} × ${s.reps}`,
                )
                .join(' · ')}{' '}
              {unit}
            </Body>
            <TextButton
              label={t('workout.copyLast')}
              size={12}
              disabled={anyDone}
              style={{ minHeight: 34, marginTop: 2 }}
              onPress={() =>
                act(() =>
                  change((e) => ({
                    ...e,
                    sets: previous.map((s) => ({
                      id: randomUUID(),
                      kg: s.kg,
                      load: loadValue({ ...s, load: undefined }, unit),
                      reps: s.reps,
                      kind: 'working' as const,
                      done: false,
                    })),
                  })),
                )
              }
            />
          </View>
        ) : null}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            marginTop: 16,
            marginBottom: 6,
          }}
        >
          {[
            t('workout.set'),
            unit.toUpperCase(),
            t('workout.reps'),
            t('workout.done'),
          ].map((label, i) => (
            <T
              key={label + i}
              size={10}
              line={14}
              color={theme.muted}
              style={{
                width: i === 0 ? 35 : i === 3 ? 43 : undefined,
                flex: i === 1 || i === 2 ? 1 : undefined,
                textAlign: 'center',
              }}
            >
              {label}
            </T>
          ))}
        </View>
        {exercise.sets.map((set, i) => {
          const warmup = set.kind === 'warmup';
          return (
            <View
              key={set.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                marginVertical: 8,
              }}
            >
              <View style={{ width: 35, alignItems: 'center', gap: 4 }}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('workout.setType', {
                    index: i + 1,
                    kind: warmup ? t('workout.warmUp') : t('workout.working'),
                  })}
                  accessibilityHint="Toggles between working and warm-up"
                  onPress={() =>
                    act(() =>
                      change((e) => ({
                        ...e,
                        sets: e.sets.map((v) =>
                          v.id === set.id
                            ? { ...v, kind: warmup ? 'working' : 'warmup' }
                            : v,
                        ),
                      })),
                    )
                  }
                  style={{
                    width: 35,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: warmup ? theme.warmup : theme.soft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <T
                    size={13}
                    line={16}
                    color={warmup ? theme.warmupText : theme.ink}
                  >
                    {warmup ? 'W' : i + 1}
                  </T>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t('workout.removeSet', { index: i + 1 })}
                  onPress={() => {
                    if (set.done) setConfirmRemove(set);
                    else
                      act(() =>
                        change((e) => ({
                          ...e,
                          sets: e.sets.filter((v) => v.id !== set.id),
                        })),
                      );
                  }}
                  style={{
                    height: 30,
                    width: 35,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <T size={19} line={22} color={theme.muted}>
                    ×
                  </T>
                </Pressable>
              </View>
              <Stepper
                label={`${exercise.name} set ${i + 1} weight`}
                value={loadValue(set, unit)}
                step={unit === 'kg' ? '2.5' : '5'}
                done={set.done}
                keyboard="decimal-pad"
                onChange={(load) =>
                  act(() => editSet(set.id, { load, done: false }))
                }
              />
              <Stepper
                label={`${exercise.name} set ${i + 1} reps`}
                value={set.reps}
                step="1"
                done={set.done}
                keyboard="number-pad"
                onChange={(reps) =>
                  act(() => editSet(set.id, { reps, done: false }))
                }
              />
              <CheckButton
                done={set.done}
                busy={busy}
                label={t('workout.completeSet', {
                  name: exercise.name,
                  index: i + 1,
                })}
                onPress={() => complete(set)}
              />
            </View>
          );
        })}
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 9 }}>
          {(['working', 'warmup'] as const).map((kind) => (
            <Press
              key={kind}
              accessibilityRole="button"
              accessibilityLabel={
                kind === 'working'
                  ? t('workout.addSet', { name: exercise.name })
                  : t('workout.addWarmUp', { name: exercise.name })
              }
              disabled={busy || exercise.sets.length >= 50}
              onPress={() => addSet(kind)}
              scale={0.98}
              style={{
                flex: 1,
                height: 46,
                borderRadius: 10,
                backgroundColor:
                  theme.scheme === 'dark' ? theme.soft : '#f5f7f0',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
            >
              <Plus size={16} color={theme.textButton} />
              <T size={13} line={16} color={theme.textButton}>
                {kind === 'working'
                  ? t('workout.workingSet')
                  : t('workout.warmUpSet')}
              </T>
            </Press>
          ))}
        </View>
      </Card>
      <Sheet
        open={restSheet}
        onClose={() => setRestSheet(false)}
        title={t('workout.restTitle', { name: exercise.name })}
        description={t('workout.restBody')}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, marginTop: 16 }}
        >
          {REST_PRESETS.map((seconds) => (
            <Chip
              key={seconds}
              label={restLabel(seconds)}
              selected={Number(restDraft) === seconds}
              onPress={() => setRestDraft(String(seconds))}
            />
          ))}
        </ScrollView>
        <Field label={t('workout.seconds')}>
          <Input
            accessibilityLabel={`${exercise.name} rest seconds`}
            keyboardType="number-pad"
            inputMode="numeric"
            value={restDraft}
            onChangeText={setRestDraft}
            maxLength={3}
          />
        </Field>
        <View style={{ marginTop: 22, gap: 6 }}>
          <PrimaryButton
            full
            label={t('workout.saveRest')}
            accessibilityLabel={t('workout.saveRestFor', {
              name: exercise.name,
            })}
            icon={<Check size={19} color={theme.primaryText} />}
            onPress={() =>
              act(async () => {
                const seconds = Number(restDraft);
                if (
                  !restDraft.trim() ||
                  !Number.isInteger(seconds) ||
                  seconds < 0 ||
                  seconds > 600
                )
                  throw new Error(t('workout.restError'));
                await change((e) => ({ ...e, restSeconds: seconds }));
                setRestSheet(false);
              })
            }
          />
          <TextButton
            label={t('workout.startRest')}
            accessibilityLabel={t('workout.startRestFor', {
              name: exercise.name,
            })}
            disabled={!Number(restDraft)}
            onPress={() => {
              rest.start({ ...exercise, restSeconds: Number(restDraft) });
              setRestSheet(false);
            }}
          />
        </View>
      </Sheet>
      <Sheet
        open={!!confirmRemove}
        onClose={() => setConfirmRemove(null)}
        title={t('workout.removeSetTitle')}
        description={t('workout.removeSetBody')}
      >
        <View style={{ marginTop: 18 }}>
          <DangerButton
            label={t('workout.removeSetButton')}
            onPress={() => {
              const target = confirmRemove;
              setConfirmRemove(null);
              if (target)
                act(() =>
                  change((e) => ({
                    ...e,
                    sets: e.sets.filter((v) => v.id !== target.id),
                  })),
                );
            }}
          />
        </View>
      </Sheet>
    </Bezel>
  );
}

export function WorkoutScreen({
  training,
  rest,
  act,
  busy,
  onFinished,
  finishRef,
}: {
  training: Training;
  rest: Rest;
  act: Act;
  busy: boolean;
  onFinished: () => void;
  finishRef: MutableRefObject<(() => void) | null>;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { data, update } = training;
  const workout = data.active!;
  const [pick, setPick] = useState(false),
    [finish, setFinish] = useState(false),
    [discard, setDiscard] = useState(false),
    [saveRoutine, setSaveRoutine] = useState(false),
    [removing, setRemoving] = useState<Exercise | null>(null),
    [error, setError] = useState(''),
    [focus, setFocus] = useState(false),
    [focusIndex, setFocusIndex] = useState(0);
  const change = (fn: (w: Workout) => Workout) =>
    update((d) => ({ ...d, active: d.active ? fn(d.active) : null }));
  const changeExercise = (id: string, fn: (e: Exercise) => Exercise) =>
    change((w) => ({
      ...w,
      exercises: w.exercises.map((e) => (e.id === id ? fn(e) : e)),
    }));
  const done = completedSets(workout),
    total = workout.exercises.reduce((n, e) => n + e.sets.length, 0),
    unfinished = total - done,
    index = Math.min(focusIndex, Math.max(0, workout.exercises.length - 1));
  const paused = !!workout.pausedAt;
  const elapsed = duration(workoutSeconds(workout, rest.clock));
  const routine = useMemo(
    () => routineFromWorkout(workout, randomUUID(), workout.name),
    [workout],
  );
  const requestFinish = () => {
    setError('');
    setFinish(true);
  };
  useEffect(() => {
    finishRef.current = requestFinish;
    return () => {
      finishRef.current = null;
    };
  });
  const finishNow = () =>
    act(async () => {
      await update((d) => {
        if (!d.active) throw new Error(t('workout.alreadyEnded'));
        const finished = finishAssignedWorkout({
          ...d.active,
          name: d.active.name.trim() || t('workout.defaultName'),
        });
        return { ...d, active: null, workouts: [...d.workouts, finished] };
      });
      rest.skip();
      setFinish(false);
      onFinished();
    }, t('workout.saved'));
  return (
    <View style={{ paddingBottom: 20 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          marginBottom: 18,
        }}
      >
        <View style={{ flex: 1, minWidth: 0 }}>
          <Eyebrow style={{ marginBottom: 8 }}>{t('workout.eyebrow')}</Eyebrow>
          <TextInput
            accessibilityLabel={t('workout.name')}
            maxLength={100}
            value={workout.name}
            onChangeText={(name) => act(() => change((w) => ({ ...w, name })))}
            style={[
              font(500),
              {
                fontSize: 31,
                letterSpacing: -1.9,
                color: theme.ink,
                height: 45,
                padding: 0,
              },
            ]}
          />
        </View>
        <PrimaryButton
          small
          label={t('workout.finish')}
          accessibilityLabel={t('workout.finishWorkout')}
          icon={<Check size={19} color={theme.primaryText} />}
          disabled={busy}
          onPress={requestFinish}
        />
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <Segmented
          options={[
            { value: 'focus', label: t('workout.focus') },
            { value: 'all', label: t('workout.allExercises') },
          ]}
          value={focus ? 'focus' : 'all'}
          onChange={(v) => setFocus(v === 'focus')}
          style={{ alignSelf: 'flex-start', minWidth: 190 }}
        />
        <View
          style={{
            marginStart: 'auto',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Body size={12} style={paused ? { color: theme.green } : undefined}>
            {t('workout.setsProgress', { done, total, elapsed })}
            {paused ? ` · ${t('workout.paused')}` : ''}
          </Body>
          <IconButton
            size={34}
            accessibilityLabel={
              paused ? t('workout.resumeTimer') : t('workout.pauseTimer')
            }
            icon={
              paused ? (
                <Play size={16} color={theme.green} />
              ) : (
                <Pause size={16} color={theme.ink} />
              )
            }
            onPress={() =>
              act(() =>
                change((w) =>
                  w.pausedAt ? resumeWorkout(w) : pauseWorkout(w),
                ),
              )
            }
          />
        </View>
      </View>
      <ErrorBanner text={error} onDismiss={() => setError('')} />
      {focus && workout.exercises.length > 0 && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <TextButton
            label={t('workout.previous')}
            size={13}
            disabled={index === 0}
            onPress={() => setFocusIndex(index - 1)}
          />
          <Body size={12}>
            {t('workout.exerciseOf', {
              index: index + 1,
              total: workout.exercises.length,
            })}
          </Body>
          <TextButton
            label={t('workout.next')}
            size={13}
            disabled={index === workout.exercises.length - 1}
            onPress={() => setFocusIndex(index + 1)}
          />
        </View>
      )}
      <View style={{ gap: 18 }}>
        {workout.exercises.map((exercise, i) =>
          focus && i !== index ? null : (
            <Reveal key={exercise.id} delay={Math.min(i, 4) * 45}>
              <ExerciseCard
                exercise={exercise}
                workouts={data.workouts}
                busy={busy}
                rest={rest}
                act={act}
                change={(fn) => changeExercise(exercise.id, fn)}
                editSet={(setId, patch) =>
                  change((w) => editWorkoutSet(w, exercise.id, setId, patch))
                }
                remove={() => {
                  if (exercise.sets.some((s) => s.done)) setRemoving(exercise);
                  else
                    act(() =>
                      change((w) => ({
                        ...w,
                        exercises: w.exercises.filter(
                          (v) => v.id !== exercise.id,
                        ),
                      })),
                    );
                }}
                onError={setError}
              />
            </Reveal>
          ),
        )}
      </View>
      {!workout.exercises.length && (
        <View
          style={{
            alignItems: 'center',
            paddingTop: 55,
            paddingBottom: 30,
            gap: 12,
          }}
        >
          <Dumbbell size={36} strokeWidth={1.4} color={theme.routineMarkText} />
          <T
            weight={500}
            size={24}
            line={28}
            tracking={-0.8}
            color={theme.secondaryText}
          >
            {t('workout.noExercises')}
          </T>
        </View>
      )}
      <View style={{ marginTop: 20 }}>
        <SecondaryButton
          full
          height={52}
          label={t('workout.addExercise')}
          background={theme.addExercise}
          icon={<Plus size={19} color={theme.secondaryText} />}
          disabled={workout.exercises.length >= 60}
          onPress={() => setPick(true)}
        />
      </View>
      <Disclosure summary="Notes and session options" style={{ marginTop: 18 }}>
        <Field label={t('workout.notes')}>
          <Input
            accessibilityLabel={t('workout.workoutNotes')}
            multiline
            maxLength={2000}
            value={workout.notes}
            onChangeText={(notes) =>
              act(() => change((w) => ({ ...w, notes })))
            }
          />
        </Field>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 13,
          }}
        >
          <TextButton
            label={t('workout.saveAsPlan')}
            icon={<Bookmark size={16} color={theme.textButton} />}
            disabled={!workout.exercises.length || data.routines.length >= 100}
            onPress={() => setSaveRoutine(true)}
          />
          <TextButton
            label={t('workout.endWithoutSaving')}
            danger
            onPress={() => setDiscard(true)}
          />
        </View>
      </Disclosure>
      <ExercisePicker
        open={pick}
        onClose={() => setPick(false)}
        onPick={(name, muscle) => {
          const previous = lastPerformance(data.workouts, name);
          act(() =>
            change((w) => ({
              ...w,
              exercises: [
                ...w.exercises,
                {
                  id: randomUUID(),
                  name,
                  muscle,
                  unit: 'kg',
                  restSeconds: 90,
                  sets: previous?.length
                    ? previous.map((s) => ({
                        id: randomUUID(),
                        kg: s.kg,
                        load: loadValue({ ...s, load: undefined }, 'kg'),
                        reps: s.reps,
                        kind: 'working' as const,
                        done: false,
                      }))
                    : Array.from({ length: 3 }, () => ({
                        id: randomUUID(),
                        kg: '',
                        load: '',
                        reps: '10',
                        kind: 'working' as const,
                        done: false,
                      })),
                },
              ],
            })),
          );
          setFocusIndex(workout.exercises.length);
          setPick(false);
        }}
      />
      <Sheet
        open={finish}
        onClose={() => setFinish(false)}
        title={done ? t('workout.finishTitle') : t('workout.endTitle')}
        description={
          <View style={{ gap: 8 }}>
            {done ? (
              <Body size={13}>
                {t('workout.summary', {
                  done,
                  noun: done === 1 ? t('you.set') : t('you.sets'),
                  volume: volume(workout).toLocaleString(undefined, {
                    maximumFractionDigits: 1,
                  }),
                })}
              </Body>
            ) : (
              <Body size={13}>{t('workout.noSetsYet')}</Body>
            )}
            {!done ? null : unfinished > 0 ? (
              <Body size={13}>
                {t('workout.unfinished', {
                  count: unfinished,
                  noun: unfinished === 1 ? t('you.set') : t('you.sets'),
                })}
              </Body>
            ) : (
              <Body size={13}>{t('workout.allDone')}</Body>
            )}
          </View>
        }
      >
        <View style={{ marginTop: 22, gap: 6 }}>
          {done > 0 && (
            <PrimaryButton
              full
              label={
                unfinished > 0
                  ? t('workout.saveFinishEarly')
                  : t('workout.saveWorkout')
              }
              icon={<Check size={19} color={theme.primaryText} />}
              disabled={busy}
              onPress={finishNow}
            />
          )}
          <TextButton
            label={t('workout.endWithoutSaving')}
            danger
            onPress={() => {
              setFinish(false);
              setDiscard(true);
            }}
          />
          <TextButton
            label={t('workout.keepTraining')}
            onPress={() => setFinish(false)}
          />
        </View>
      </Sheet>
      <Sheet
        open={discard}
        onClose={() => setDiscard(false)}
        title={t('workout.endConfirmTitle')}
        description={t('workout.endConfirmBody')}
      >
        <View style={{ marginTop: 18 }}>
          <DangerButton
            label={t('workout.endWorkout')}
            onPress={() =>
              act(async () => {
                await update((d) => ({ ...d, active: null }));
                rest.skip();
                setDiscard(false);
                onFinished();
              })
            }
          />
        </View>
      </Sheet>
      <Sheet
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={t('workout.removeExerciseTitle')}
        description={t('workout.removeExerciseBody')}
      >
        <View style={{ marginTop: 18 }}>
          <DangerButton
            label={t('workout.removeExercise')}
            onPress={() => {
              const target = removing;
              setRemoving(null);
              if (target)
                act(() =>
                  change((w) => ({
                    ...w,
                    exercises: w.exercises.filter((v) => v.id !== target.id),
                  })),
                );
            }}
          />
        </View>
      </Sheet>
      {saveRoutine && (
        <RoutineEditor
          open
          routine={routine}
          onClose={() => setSaveRoutine(false)}
          onSave={(r) =>
            act(
              () =>
                update((d) => ({
                  ...d,
                  routines: [...d.routines, { ...r, id: randomUUID() }],
                })),
              t('workout.planSaved'),
            )
          }
        />
      )}
    </View>
  );
}
