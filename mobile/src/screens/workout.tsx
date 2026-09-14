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
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  Bookmark,
  Check,
  ChevronDown,
  Copy,
  Dumbbell,
  GripVertical,
  Link2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Repeat,
  Trash2,
  Unlink,
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
  easeOut,
} from '../ui';
import { DemoVideo } from '../components/demo-video';
import { ExercisePicker } from './exercise-picker';
import {
  ArrangeSheet,
  PairSheet,
  pairInto,
  supersetLetters,
  unpairFrom,
} from './exercise-tools';
import { RoutineEditor } from './routine-editor';
import { duration, loadValue, restLabel, type Act } from './shared';

const REST_PRESETS = [30, 60, 90, 120, 180];
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
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          width: 43,
          height: 48,
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
          height: 48,
          borderRadius: 14,
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

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function SetField({
  value,
  label,
  done,
  onChange,
  keyboard,
}: {
  value: string;
  label: string;
  done: boolean;
  onChange: (value: string) => void;
  keyboard: 'decimal-pad' | 'number-pad';
}) {
  const { theme } = useTheme();
  // Focus is shown through an animated border rather than state: a re-render
  // between focus and the first keystroke would reset the field's selection.
  const focus = useRef(new Animated.Value(0)).current;
  const setFocus = (to: number) =>
    Animated.timing(focus, {
      toValue: to,
      duration: 140,
      easing: easeOut,
      useNativeDriver: false,
    }).start();
  // Typed text is kept locally so a re-render mid-keystroke never snaps the
  // field back to the last saved value.
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const resting = done ? '#759764' : theme.soft;
  return (
    <AnimatedTextInput
      accessibilityLabel={label}
      keyboardType={keyboard}
      inputMode={keyboard === 'decimal-pad' ? 'decimal' : 'numeric'}
      value={draft}
      placeholder="0"
      placeholderTextColor={theme.placeholder}
      maxLength={keyboard === 'decimal-pad' ? 8 : 4}
      selectTextOnFocus
      onChangeText={(next) => {
        setDraft(next);
        onChange(next);
      }}
      onFocus={() => setFocus(1)}
      onBlur={() => setFocus(0)}
      style={[
        font(500),
        {
          flex: 1,
          minWidth: 0,
          height: 48,
          borderRadius: 12,
          fontSize: 22,
          textAlign: 'center',
          color: done ? theme.setDoneText : theme.ink,
          backgroundColor: done ? theme.setDone : theme.soft,
          borderWidth: 1.5,
          borderColor: focus.interpolate({
            inputRange: [0, 1],
            outputRange: [resting, theme.green],
          }),
          paddingHorizontal: 4,
        },
      ]}
    />
  );
}

/** One set: number toggle, typed weight and reps, done check. Swipe it away to remove it. */
function SetRow({
  exercise,
  set,
  index,
  number,
  unit,
  busy,
  onToggleKind,
  onEditLoad,
  onEditReps,
  onComplete,
  onRemove,
}: {
  exercise: Exercise;
  set: LiftSet;
  index: number;
  number: number;
  unit: 'kg' | 'lb';
  busy: boolean;
  onToggleKind: () => void;
  onEditLoad: (load: string) => void;
  onEditReps: (reps: string) => void;
  onComplete: () => void;
  /** Called once the row has slid away; returns false to snap it back instead. */
  onRemove: () => boolean;
}) {
  const { theme } = useTheme();
  const { t, rtl } = useI18n();
  const { width } = useWindowDimensions();
  const warmup = set.kind === 'warmup';
  const drag = useRef(new Animated.Value(0)).current;
  const offset = useRef(0);
  // Swiping toward the trailing edge reveals the remove area.
  const away = rtl ? 1 : -1;
  const REVEAL = 88;
  const settle = (to: number) =>
    Animated.spring(drag, {
      toValue: to,
      damping: 18,
      stiffness: 220,
      mass: 0.6,
      useNativeDriver: native,
    }).start(() => {
      offset.current = to;
    });
  const fade = useRef(new Animated.Value(1)).current;
  const collapse = useRef(new Animated.Value(1)).current;
  const reset = () => {
    drag.setValue(0);
    fade.setValue(1);
    collapse.setValue(1);
    offset.current = 0;
  };
  // The row fades while it folds, in one beat, so the ones below settle up.
  const fold = () =>
    Animated.timing(collapse, {
      toValue: 0,
      duration: 200,
      easing: easeOut,
      useNativeDriver: false,
    });
  const dismiss = () =>
    Animated.parallel([
      Animated.timing(drag, {
        toValue: away * width,
        duration: 160,
        easing: easeOut,
        useNativeDriver: native,
      }),
      fold(),
    ]).start(() => {
      if (!onRemove()) reset();
    });
  const remove = () =>
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 0,
        duration: 140,
        easing: easeOut,
        useNativeDriver: native,
      }),
      fold(),
    ]).start(() => {
      if (!onRemove()) reset();
    });
  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.4,
      onPanResponderMove: (_, g) => {
        const raw = offset.current + g.dx;
        const along = raw * away; // positive when moving toward the remove area
        const value =
          along < 0
            ? raw * 0.18 // friction when pushed the wrong way
            : along > REVEAL
              ? away * (REVEAL + (along - REVEAL) * 0.35) // damping past the reveal
              : raw;
        drag.setValue(value);
      },
      onPanResponderRelease: (_, g) => {
        const along = (offset.current + g.dx) * away;
        const flick = g.vx * away > 0.6;
        if (along > REVEAL * 1.4 || flick) dismiss();
        else if (along > REVEAL * 0.5) settle(away * REVEAL);
        else settle(0);
      },
      onPanResponderTerminate: () => settle(0),
    }),
  ).current;
  return (
    <Animated.View
      style={{
        overflow: 'hidden',
        height: collapse.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 58],
        }),
        opacity: fade,
        transform: [
          {
            scale: fade.interpolate({
              inputRange: [0, 1],
              outputRange: [0.97, 1],
            }),
          },
        ],
        paddingVertical: 5,
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 5,
          bottom: 5,
          end: 0,
          width: REVEAL + 40,
          borderRadius: 12,
          backgroundColor: theme.danger,
          alignItems: rtl ? 'flex-start' : 'flex-end',
          justifyContent: 'center',
          paddingHorizontal: 18,
          opacity: drag.interpolate({
            inputRange: away < 0 ? [-REVEAL, 0] : [0, REVEAL],
            outputRange: away < 0 ? [1, 0] : [0, 1],
            extrapolate: 'clamp',
          }),
        }}
      >
        <T weight={500} size={13} line={16} color="#fff">
          {t('workout.swipeRemove')}
        </T>
      </View>
      <Animated.View
        {...responder.panHandlers}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: theme.surface,
          transform: [{ translateX: drag }],
        }}
      >
        <Press
          accessibilityRole="button"
          accessibilityLabel={t('workout.setType', {
            index: index + 1,
            kind: warmup ? t('workout.warmUp') : t('workout.working'),
          })}
          accessibilityHint={t('workout.holdToRemove')}
          scale={0.88}
          onPress={onToggleKind}
          onLongPress={remove}
          delayLongPress={450}
          style={{
            width: 36,
            height: 48,
            borderRadius: 12,
            backgroundColor: warmup ? theme.warmup : theme.soft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <T
            weight={500}
            size={14}
            line={18}
            color={warmup ? theme.warmupText : theme.ink}
          >
            {warmup ? 'W' : number}
          </T>
        </Press>
        <SetField
          label={`${exercise.name} set ${index + 1} weight`}
          value={loadValue(set, unit)}
          done={set.done}
          keyboard="decimal-pad"
          onChange={onEditLoad}
        />
        <SetField
          label={`${exercise.name} set ${index + 1} reps`}
          value={set.reps}
          done={set.done}
          keyboard="number-pad"
          onChange={onEditReps}
        />
        <CheckButton
          done={set.done}
          busy={busy}
          label={t('workout.completeSet', {
            name: exercise.name,
            index: index + 1,
          })}
          onPress={onComplete}
        />
        <Press
          accessibilityRole="button"
          accessibilityLabel={t('workout.removeSet', { index: index + 1 })}
          onPress={remove}
          scale={0.8}
          hitSlop={8}
          style={{
            width: 26,
            height: 26,
            borderRadius: 13,
            backgroundColor: theme.soft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={14} strokeWidth={2.4} color={theme.muted} />
        </Press>
      </Animated.View>
    </Animated.View>
  );
}

/** Copies the previous session's sets in; confirms with a short "Copied" beat. */
function CopyLastButton({
  disabled,
  onPress,
}: {
  disabled: boolean;
  onPress: () => void;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const pop = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!copied) return;
    Animated.sequence([
      Animated.timing(pop, {
        toValue: 0.94,
        duration: 80,
        easing: Easing.out(Easing.quad),
        useNativeDriver: native,
      }),
      Animated.spring(pop, {
        toValue: 1,
        friction: 5,
        tension: 200,
        useNativeDriver: native,
      }),
    ]).start();
    const clear = setTimeout(() => setCopied(false), 1400);
    return () => clearTimeout(clear);
  }, [copied, pop]);
  return (
    <Animated.View
      style={{ alignSelf: 'flex-start', transform: [{ scale: pop }] }}
    >
      <SecondaryButton
        height={38}
        size={13}
        label={copied ? t('workout.copied') : t('workout.copyLastAction')}
        accessibilityLabel={t('workout.copyLastAction')}
        background={copied ? theme.setDone : undefined}
        color={copied ? theme.setDoneText : undefined}
        icon={
          copied ? (
            <Check size={15} color={theme.setDoneText} />
          ) : (
            <Copy size={15} color={theme.secondaryText} />
          )
        }
        disabled={disabled || copied}
        onPress={() => {
          onPress();
          setCopied(true);
        }}
      />
    </Animated.View>
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
  onMenu,
  supersetLabel,
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
  onMenu: () => void;
  supersetLabel?: string;
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
      act(async () => {
        await editSet(set.id, { done: false });
        if (rest.exerciseId === exercise.id) rest.skip();
      });
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
    const set: LiftSet = {
      id: randomUUID(),
      kg: kind === 'warmup' ? '' : (last?.kg ?? ''),
      load: kind === 'warmup' ? '' : last ? loadValue(last, unit) : '',
      reps: last?.reps ?? '10',
      kind,
      done: false,
    };
    act(() =>
      change((e) => {
        // Warm-ups belong before the first working set; working sets go last.
        const at =
          kind === 'warmup' ? e.sets.findIndex((v) => v.kind !== 'warmup') : -1;
        const sets = [...e.sets];
        sets.splice(at === -1 ? sets.length : at, 0, set);
        return { ...e, sets };
      }),
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
            flexWrap: 'nowrap',
          }}
        >
          <Thumbnail name={exercise.name} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T weight={500} size={23} line={27} tracking={-0.8}>
              {exercise.name}
            </T>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                marginTop: 3,
              }}
            >
              <Body size={11}>{exercise.muscle}</Body>
              {supersetLabel ? (
                <View
                  style={{
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: 8,
                    backgroundColor: theme.setDone,
                  }}
                >
                  <T size={10} line={14} weight={500} color={theme.setDoneText}>
                    {supersetLabel}
                  </T>
                </View>
              ) : null}
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
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
            <Press
              accessibilityRole="button"
              accessibilityLabel={t('workout.options', { name: exercise.name })}
              onPress={onMenu}
              scale={0.88}
              style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: theme.secondaryButton,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MoreHorizontal size={17} color={theme.secondaryText} />
            </Press>
          </View>
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
            <View style={{ marginTop: 8 }}>
              <CopyLastButton
                disabled={anyDone}
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
                width: i === 0 ? 36 : i === 3 ? 43 : undefined,
                flex: i === 1 || i === 2 ? 1 : undefined,
                textAlign: 'center',
              }}
            >
              {label}
            </T>
          ))}
          <View style={{ width: 26 }} />
        </View>
        {exercise.sets.map((set, i) => {
          const number = exercise.sets
            .slice(0, i + 1)
            .filter((v) => v.kind !== 'warmup').length;
          return (
            <Reveal
              key={set.id}
              y={6}
              duration={220}
              delay={Math.min(i, 6) * 30}
            >
              <SetRow
                exercise={exercise}
                set={set}
                index={i}
                number={number}
                unit={unit}
                busy={busy}
                onToggleKind={() =>
                  act(() =>
                    change((e) => ({
                      ...e,
                      sets: e.sets.map((v) =>
                        v.id === set.id
                          ? {
                              ...v,
                              kind: v.kind === 'warmup' ? 'working' : 'warmup',
                            }
                          : v,
                      ),
                    })),
                  )
                }
                onEditLoad={(load) =>
                  act(() => editSet(set.id, { load, done: false }))
                }
                onEditReps={(reps) =>
                  act(() => editSet(set.id, { reps, done: false }))
                }
                onComplete={() => complete(set)}
                onRemove={() => {
                  if (set.done) {
                    setConfirmRemove(set);
                    return false;
                  }
                  act(() =>
                    change((e) => ({
                      ...e,
                      sets: e.sets.filter((v) => v.id !== set.id),
                    })),
                  );
                  return true;
                }}
              />
            </Reveal>
          );
        })}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
          <View style={{ flex: 1.5 }}>
            <Press
              accessibilityRole="button"
              accessibilityLabel={t('workout.addSet', { name: exercise.name })}
              disabled={busy || exercise.sets.length >= 50}
              onPress={() => addSet('working')}
              scale={0.97}
              style={{
                height: 44,
                borderRadius: 12,
                backgroundColor: theme.soft,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Plus size={16} strokeWidth={2.2} color={theme.ink} />
              <T weight={500} size={13} line={16}>
                {t('workout.addSetShort')}
              </T>
            </Press>
          </View>
          <View style={{ flex: 1 }}>
            <Press
              accessibilityRole="button"
              accessibilityLabel={t('workout.addWarmUp', {
                name: exercise.name,
              })}
              disabled={busy || exercise.sets.length >= 50}
              onPress={() => addSet('warmup')}
              scale={0.97}
              style={{
                height: 44,
                borderRadius: 12,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: theme.warmupText + '66',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <Plus size={15} strokeWidth={2.2} color={theme.warmupText} />
              <T weight={500} size={13} line={16} color={theme.warmupText}>
                {t('workout.addWarmUpShort')}
              </T>
            </Press>
          </View>
        </View>
      </Card>
      <Sheet
        open={restSheet}
        onClose={() => setRestSheet(false)}
        title={t('workout.restTitle', { name: exercise.name })}
        description={t('workout.restBody')}
      >
        <View
          style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 6,
            marginTop: 16,
            marginBottom: 6,
          }}
        >
          {REST_PRESETS.map((seconds) => (
            <Chip
              key={seconds}
              label={restLabel(seconds)}
              selected={Number(restDraft) === seconds}
              onPress={() => setRestDraft(String(seconds))}
            />
          ))}
        </View>
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
            center
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
  onMinimize,
  finishRef,
}: {
  training: Training;
  rest: Rest;
  act: Act;
  busy: boolean;
  onFinished: () => void;
  onMinimize: () => void;
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
    [menu, setMenu] = useState<Exercise | null>(null),
    [pairing, setPairing] = useState<Exercise | null>(null),
    [arranging, setArranging] = useState(false),
    [replacing, setReplacing] = useState<Exercise | null>(null),
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
  const letters = useMemo(
    () => supersetLetters(workout.exercises),
    [workout.exercises],
  );
  const keyOf = (e: Exercise) => e.id;
  const pair = (a: Exercise, b: Exercise) =>
    act(() =>
      change((w) => ({
        ...w,
        exercises: pairInto(w.exercises, keyOf, a, b, randomUUID),
      })),
    );
  const unpair = (target: Exercise) =>
    act(() =>
      change((w) => ({
        ...w,
        exercises: unpairFrom(w.exercises, keyOf, target),
      })),
    );
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
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <IconButton
            size={40}
            background={theme.soft}
            accessibilityLabel={t('workout.minimize')}
            icon={<ChevronDown size={19} color={theme.ink} />}
            onPress={onMinimize}
          />
          <PrimaryButton
            small
            label={t('workout.finish')}
            accessibilityLabel={t('workout.finishWorkout')}
            icon={<Check size={19} color={theme.primaryText} />}
            disabled={busy}
            onPress={requestFinish}
          />
        </View>
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
          scroll
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
                onMenu={() => setMenu(exercise)}
                supersetLabel={
                  exercise.supersetId
                    ? t('workout.supersetTag', {
                        letter: letters.get(exercise.supersetId) ?? '',
                      })
                    : undefined
                }
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
        open={pick || !!replacing}
        onClose={() => {
          setPick(false);
          setReplacing(null);
        }}
        onPick={(name, muscle) => {
          if (replacing) {
            const target = replacing;
            setReplacing(null);
            act(() =>
              changeExercise(target.id, (e) => ({
                ...e,
                name,
                muscle,
                instructions: undefined,
                videoUrl: undefined,
                sets: e.sets.map((v) => ({ ...v, done: false })),
              })),
            );
            return;
          }
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
              center
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
          <SecondaryButton
            full
            label={t('workout.keepTraining')}
            onPress={() => setFinish(false)}
          />
          <TextButton
            label={t('workout.endWithoutSaving')}
            danger
            style={{ alignSelf: 'center', marginTop: 4 }}
            onPress={() => {
              setFinish(false);
              setDiscard(true);
            }}
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
        open={!!menu}
        onClose={() => setMenu(null)}
        title={menu?.name ?? t('workout.optionsTitle')}
        description={menu?.muscle}
      >
        {menu && (
          <View style={{ gap: 8, marginTop: 16 }}>
            {(
              [
                {
                  key: 'replace',
                  icon: <Repeat size={19} color={theme.secondaryText} />,
                  label: t('workout.replace'),
                  hint: t('workout.replaceHint'),
                  onPress: () => setReplacing(menu),
                },
                {
                  key: 'arrange',
                  icon: <GripVertical size={19} color={theme.secondaryText} />,
                  label: t('workout.arrange'),
                  hint: t('workout.arrangeHint'),
                  disabled: workout.exercises.length < 2,
                  onPress: () => setArranging(true),
                },
                menu.supersetId
                  ? {
                      key: 'unpair',
                      icon: <Unlink size={19} color={theme.secondaryText} />,
                      label: t('workout.leaveSuperset'),
                      onPress: () => unpair(menu),
                    }
                  : {
                      key: 'pair',
                      icon: <Link2 size={19} color={theme.secondaryText} />,
                      label: t('workout.superset'),
                      hint: t('workout.supersetHint'),
                      disabled: workout.exercises.length < 2,
                      onPress: () => setPairing(menu),
                    },
                {
                  key: 'remove',
                  icon: <Trash2 size={19} color={theme.danger} />,
                  label: t('workout.removeExercise'),
                  danger: true,
                  onPress: () => {
                    if (menu.sets.some((s) => s.done)) setRemoving(menu);
                    else
                      act(() =>
                        change((w) => ({
                          ...w,
                          exercises: w.exercises.filter(
                            (v) => v.id !== menu.id,
                          ),
                        })),
                      );
                  },
                },
              ] as {
                key: string;
                icon: React.ReactNode;
                label: string;
                hint?: string;
                disabled?: boolean;
                danger?: boolean;
                onPress: () => void;
              }[]
            ).map((item, i) => (
              <Reveal key={item.key} y={8} duration={220} delay={i * 30}>
                <Press
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  disabled={item.disabled}
                  scale={0.985}
                  onPress={() => {
                    setMenu(null);
                    item.onPress();
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    borderRadius: 14,
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    minHeight: 56,
                    backgroundColor: theme.soft,
                  }}
                >
                  {item.icon}
                  <View style={{ flex: 1 }}>
                    <T
                      weight={500}
                      size={14}
                      line={18}
                      color={item.danger ? theme.danger : theme.secondaryText}
                    >
                      {item.label}
                    </T>
                    {item.hint ? (
                      <Body size={12} style={{ marginTop: 2 }}>
                        {item.hint}
                      </Body>
                    ) : null}
                  </View>
                </Press>
              </Reveal>
            ))}
          </View>
        )}
      </Sheet>
      <ArrangeSheet
        open={arranging}
        exercises={workout.exercises.map((e) => ({
          key: e.id,
          name: e.name,
          muscle: e.muscle,
        }))}
        onClose={() => setArranging(false)}
        onCommit={(ids) =>
          act(() =>
            change((w) => ({
              ...w,
              exercises: ids.map((id) => w.exercises.find((e) => e.id === id)!),
            })),
          )
        }
      />
      <PairSheet
        open={!!pairing}
        subject={
          pairing
            ? { key: pairing.id, name: pairing.name, muscle: pairing.muscle }
            : null
        }
        items={workout.exercises.map((e) => ({
          key: e.id,
          name: e.name,
          muscle: e.muscle,
        }))}
        onClose={() => setPairing(null)}
        onPick={(key) => {
          const partner = workout.exercises.find((e) => e.id === key);
          const subject = pairing;
          setPairing(null);
          if (subject && partner) pair(subject, partner);
        }}
      />
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
