import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { randomUUID } from 'expo-crypto';
import type { Workout } from '../lib/fitness';
import {
  editWorkoutSet,
  finishAssignedWorkout,
  foundationProgram,
  startAssignedWorkout,
} from '../lib/mobile-workout';
import { loadWorkspace, request, type Role } from './src/api';

type Snapshot = Awaited<ReturnType<typeof loadWorkspace>>;
function initialRole(): Role {
  if (
    Platform.OS === 'web' &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('role') === 'coach'
  )
    return 'coach';
  return 'client';
}
export default function App() {
  const [role, setRole] = useState<Role>(initialRole);
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.preview}>
          <Text style={styles.previewLabel}>LOCAL PREVIEW</Text>
          <View style={styles.roles}>
            {(['coach', 'client'] as const).map((item) => (
              <Pressable
                key={item}
                accessibilityRole="button"
                accessibilityLabel={`Preview as ${item}`}
                accessibilityState={{ selected: role === item }}
                onPress={() => setRole(item)}
                style={[styles.role, role === item && styles.roleActive]}
              >
                <Text
                  style={[
                    styles.roleLabel,
                    role === item && styles.roleLabelActive,
                  ]}
                >
                  {item === 'coach' ? 'Coach' : 'Client'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
        <Workspace key={role} role={role} />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
function Button({
  label,
  onPress,
  disabled = false,
  secondary = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.buttonSecondary,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Text
        style={[styles.buttonLabel, secondary && styles.buttonSecondaryLabel]}
      >
        {label}
      </Text>
    </Pressable>
  );
}
function Workspace({ role }: { role: Role }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState<Workout | null>(null);
  const [title, setTitle] = useState('Strength A');
  const [notes, setNotes] = useState(
    'Leave two reps in reserve. Move with control.',
  );
  const mounted = useRef(true);
  const refreshingRef = useRef(false);
  const busyRef = useRef(false);
  const refresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    try {
      const next = await loadWorkspace(role);
      if (mounted.current) {
        setSnapshot(next);
        setError('');
      }
    } catch (e) {
      if (mounted.current)
        setError(
          e instanceof Error ? e.message : 'Could not load your workspace.',
        );
    } finally {
      refreshingRef.current = false;
    }
  }, [role]);
  useEffect(() => {
    mounted.current = true;
    void refresh();
    const timer = setInterval(() => {
      if (!busyRef.current && AppState.currentState !== 'background')
        void refresh();
    }, 3000);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [refresh]);
  async function perform(action: () => Promise<void>) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      await refresh();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'The update could not be saved.',
      );
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  const member = snapshot?.detail?.member;
  const fitness = snapshot?.fitness;
  const active = draft ?? fitness?.data.active ?? null;
  const program = member?.program;
  const history =
    snapshot?.detail?.fitness?.workouts ?? fitness?.data.workouts ?? [];
  const sharedHistory = history.filter(
    (workout) => workout.membershipId === member?.id,
  );
  async function saveActive(workout: Workout) {
    if (!fitness) throw new Error('Reload your workout log before saving.');
    await request(
      role,
      '/api/data',
      {
        data: { ...fitness.data, active: workout },
        revision: fitness.revision,
      },
      'PUT',
    );
  }
  function updateSet(
    exerciseId: string,
    setId: string,
    patch: { load?: string; reps?: string; done?: boolean },
  ) {
    if (!active) return;
    try {
      const next = editWorkoutSet(active, exerciseId, setId, patch);
      setDraft(next);
      setError('');
      if (patch.done !== undefined)
        void perform(async () => {
          await saveActive(next);
        });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check this set.');
    }
  }
  const completed =
    active?.exercises
      .flatMap((exercise) => exercise.sets)
      .filter((set) => set.done).length ?? 0;
  const total =
    active?.exercises.reduce(
      (count, exercise) => count + exercise.sets.length,
      0,
    ) ?? 0;
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void refresh().finally(() => setRefreshing(false));
          }}
        />
      }
    >
      <View style={styles.brandRow}>
        <Text style={styles.brand}>
          form<Text style={styles.brandDot}>.</Text>
        </Text>
        <Text style={styles.eyebrow}>
          {role === 'coach' ? 'COACH WORKSPACE' : 'TRAINING JOURNAL'}
        </Text>
      </View>
      <Text style={styles.greeting}>
        {role === 'coach'
          ? 'Make progress\npersonal.'
          : 'Show up.\nGet stronger.'}
      </Text>
      <Text style={styles.subtitle}>
        {role === 'coach'
          ? 'A clear plan. A client moving forward.'
          : 'Your coach’s plan, one set at a time.'}
      </Text>
      {!!error && (
        <View style={styles.error} accessibilityRole="alert">
          <Text style={styles.errorText}>{error}</Text>
          <Button
            label="Retry connection"
            secondary
            onPress={() => void refresh()}
          />
        </View>
      )}
      {!!notice && (
        <Text accessibilityLiveRegion="polite" style={styles.notice}>
          {notice}
        </Text>
      )}
      {!snapshot && !error && (
        <View style={styles.loading}>
          <ActivityIndicator color="#245b3e" />
          <Text style={styles.muted}>Loading your workspace…</Text>
        </View>
      )}
      {snapshot && !member && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No active coaching relationship</Text>
          <Text style={styles.body}>
            Run the local seed command to create the coach and client fixture,
            then refresh.
          </Text>
        </View>
      )}
      {member && (
        <>
          <View style={styles.person}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {role === 'coach' ? 'AC' : 'SC'}
              </Text>
            </View>
            <View style={styles.flex}>
              <Text style={styles.personName}>
                {role === 'coach' ? member.name : member.coachName}
              </Text>
              <Text style={styles.muted}>
                {role === 'coach'
                  ? 'Your client · Strength coaching'
                  : 'Your coach · Strength coaching'}
              </Text>
            </View>
            <Text style={styles.activeLabel}>Active</Text>
          </View>
          {role === 'coach' ? (
            <>
              <View style={styles.stats}>
                <View>
                  <Text style={styles.statValue}>
                    {sharedHistory.length.toString().padStart(2, '0')}
                  </Text>
                  <Text style={styles.muted}>Shared workouts</Text>
                </View>
                <View style={styles.statDivider} />
                <View>
                  <Text style={styles.statValue}>{program ? '01' : '00'}</Text>
                  <Text style={styles.muted}>Assigned program</Text>
                </View>
              </View>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>The next session</Text>
                <Text style={styles.sectionNumber}>01</Text>
              </View>
              <View style={styles.card}>
                <Text style={styles.label}>SESSION NAME</Text>
                <TextInput
                  accessibilityLabel="Session name"
                  value={title}
                  onChangeText={setTitle}
                  maxLength={100}
                  style={styles.input}
                  editable={!busy}
                />
                <Text style={styles.label}>COACH’S NOTE</Text>
                <TextInput
                  accessibilityLabel="Coach note"
                  value={notes}
                  onChangeText={setNotes}
                  maxLength={2000}
                  multiline
                  style={[styles.input, styles.noteInput]}
                  editable={!busy}
                />
                <View style={styles.exerciseSummary}>
                  <Text style={styles.bodyStrong}>Bench press</Text>
                  <Text style={styles.muted}>2 × 8</Text>
                </View>
                <View style={styles.exerciseSummary}>
                  <Text style={styles.bodyStrong}>Seated cable row</Text>
                  <Text style={styles.muted}>2 × 10</Text>
                </View>
                <Button
                  label={
                    busy
                      ? 'Saving…'
                      : program
                        ? 'Update assignment'
                        : 'Assign workout'
                  }
                  disabled={busy || !title.trim()}
                  onPress={() =>
                    void perform(async () => {
                      await request(role, '/api/coaching', {
                        action: 'program',
                        memberId: member.id,
                        revision: member.revision,
                        program: foundationProgram(title.trim(), notes),
                      });
                      setNotice('Workout assigned. Alex can start it now.');
                    })
                  }
                />
              </View>
            </>
          ) : (
            <>
              <View style={styles.sectionHead}>
                <Text style={styles.sectionTitle}>
                  {active ? 'Your workout' : 'Your next session'}
                </Text>
                <Text style={styles.sectionNumber}>01</Text>
              </View>
              {!program && !active ? (
                <View style={styles.card}>
                  <Text style={styles.cardTitle}>A plan is on its way.</Text>
                  <Text style={styles.body}>
                    Your coach hasn’t assigned a workout yet. It will appear
                    here when it’s ready.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.sessionCard}>
                    <Text style={styles.sessionEyebrow}>
                      {active ? 'IN PROGRESS' : 'ASSIGNED BY YOUR COACH'}
                    </Text>
                    <Text style={styles.sessionTitle}>
                      {active?.name ?? program?.title}
                    </Text>
                    <Text style={styles.sessionNote}>{program?.notes}</Text>
                    {active ? (
                      <>
                        <Text style={styles.sessionNote}>
                          {completed} of {total} sets complete
                        </Text>
                        <View style={styles.track}>
                          <View
                            style={[
                              styles.progress,
                              {
                                width: `${total ? (completed / total) * 100 : 0}%`,
                              },
                            ]}
                          />
                        </View>
                      </>
                    ) : (
                      <Text style={styles.sessionNote}>
                        {program?.sessions[0]?.exercises.length} exercises ·
                        Strength
                      </Text>
                    )}
                  </View>
                  {!active && program && (
                    <Button
                      label="Start workout"
                      disabled={busy}
                      onPress={() =>
                        void perform(async () => {
                          const workout = startAssignedWorkout(
                            program,
                            member.id,
                            randomUUID,
                          );
                          await saveActive(workout);
                          setDraft(workout);
                        })
                      }
                    />
                  )}
                  {active && (
                    <>
                      {active.exercises.map((exercise, index) => (
                        <View key={exercise.id} style={styles.card}>
                          <Text style={styles.label}>
                            EXERCISE {String(index + 1).padStart(2, '0')}
                          </Text>
                          <Text style={styles.cardTitle}>{exercise.name}</Text>
                          <View style={styles.setHeader}>
                            <Text style={styles.setIndex}>SET</Text>
                            <Text style={styles.setHeading}>
                              {(exercise.unit ?? 'kg').toUpperCase()}
                            </Text>
                            <Text style={styles.setHeading}>REPS</Text>
                            <Text style={styles.setIndex}>DONE</Text>
                          </View>
                          {exercise.sets.map((set, setIndex) => (
                            <View key={set.id} style={styles.setRow}>
                              <Text style={styles.setIndex}>
                                {setIndex + 1}
                              </Text>
                              <TextInput
                                accessibilityLabel={`${exercise.name} set ${setIndex + 1} weight`}
                                value={set.load ?? set.kg}
                                placeholder="0"
                                keyboardType="decimal-pad"
                                style={[
                                  styles.setInput,
                                  set.done && styles.setComplete,
                                ]}
                                editable={!busy && !set.done}
                                onChangeText={(load) =>
                                  updateSet(exercise.id, set.id, { load })
                                }
                              />
                              <TextInput
                                accessibilityLabel={`${exercise.name} set ${setIndex + 1} reps`}
                                value={set.reps}
                                keyboardType="number-pad"
                                style={[
                                  styles.setInput,
                                  set.done && styles.setComplete,
                                ]}
                                editable={!busy && !set.done}
                                onChangeText={(reps) =>
                                  updateSet(exercise.id, set.id, { reps })
                                }
                              />
                              <Pressable
                                accessibilityRole="checkbox"
                                accessibilityLabel={`Complete ${exercise.name} set ${setIndex + 1}`}
                                accessibilityState={{
                                  checked: set.done,
                                  disabled: busy,
                                }}
                                aria-checked={set.done}
                                disabled={busy}
                                onPress={() =>
                                  updateSet(exercise.id, set.id, {
                                    done: !set.done,
                                  })
                                }
                                style={[
                                  styles.check,
                                  set.done && styles.checked,
                                ]}
                              >
                                <Text
                                  style={
                                    set.done ? styles.checkOn : styles.checkOff
                                  }
                                >
                                  {set.done ? '✓' : '○'}
                                </Text>
                              </Pressable>
                            </View>
                          ))}
                        </View>
                      ))}
                      <Button
                        label={busy ? 'Saving…' : 'Finish workout'}
                        disabled={busy || completed !== total}
                        onPress={() =>
                          void perform(async () => {
                            if (!fitness) return;
                            const workout = finishAssignedWorkout(active);
                            await request(
                              role,
                              '/api/data',
                              {
                                data: {
                                  ...fitness.data,
                                  active: null,
                                  workouts: [workout, ...fitness.data.workouts],
                                },
                                revision: fitness.revision,
                              },
                              'PUT',
                            );
                            setDraft(null);
                            setNotice(
                              'Workout saved. Your coach can review your sets.',
                            );
                          })
                        }
                      />
                    </>
                  )}
                </>
              )}
            </>
          )}
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>
              {role === 'coach' ? 'Client activity' : 'Your recent work'}
            </Text>
            <Text style={styles.sectionNumber}>02</Text>
          </View>
          {!sharedHistory.length ? (
            <View style={styles.empty}>
              <Text style={styles.body}>
                Every session starts a little progress.
              </Text>
              <Text style={styles.muted}>
                Completed workouts will appear here.
              </Text>
            </View>
          ) : (
            sharedHistory.slice(0, 3).map((workout) => (
              <View key={workout.id} style={styles.card}>
                <View style={styles.exerciseSummary}>
                  <Text style={styles.cardTitle}>{workout.name}</Text>
                  <Text style={styles.activeLabel}>Completed</Text>
                </View>
                <Text style={styles.muted}>
                  {new Date(
                    workout.finishedAt ?? workout.startedAt,
                  ).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                  })}
                </Text>
                {workout.exercises.map((exercise) => (
                  <View key={exercise.id} style={styles.historyExercise}>
                    <Text style={styles.bodyStrong}>{exercise.name}</Text>
                    <Text style={styles.muted}>
                      {exercise.sets
                        .filter((set) => set.done)
                        .map(
                          (set) =>
                            `${set.load ?? set.kg} ${exercise.unit ?? 'kg'} × ${set.reps}`,
                        )
                        .join(' · ')}
                    </Text>
                  </View>
                ))}
              </View>
            ))
          )}
        </>
      )}
      <Text style={styles.footer}>
        FORM / LOCAL DEVELOPMENT{'\n'}Separate accounts. Shared progress.
      </Text>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f7f4' },
  scroll: { flex: 1 },
  content: {
    padding: 22,
    paddingBottom: 36,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
    gap: 18,
  },
  preview: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e6df',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#68756c',
  },
  roles: { flexDirection: 'row', gap: 3 },
  role: { paddingHorizontal: 15, paddingVertical: 9, borderRadius: 18 },
  roleActive: { backgroundColor: '#172921' },
  roleLabel: { fontSize: 13, fontWeight: '600', color: '#68756c' },
  roleLabelActive: { color: 'white' },
  brandRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  brand: {
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: -2.5,
    color: '#172921',
  },
  brandDot: { color: '#7c897e' },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: '700',
    color: '#68756c',
  },
  greeting: {
    fontSize: 42,
    lineHeight: 45,
    letterSpacing: -2,
    fontWeight: '600',
    color: '#172921',
    marginTop: 9,
  },
  subtitle: { fontSize: 15, lineHeight: 23, color: '#68756c', marginTop: -6 },
  person: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e1e6df',
    marginTop: 4,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e3eadf',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 14, fontWeight: '600', color: '#245b3e' },
  flex: { flex: 1 },
  personName: {
    color: '#172921',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 3,
  },
  muted: { fontSize: 13, lineHeight: 20, color: '#68756c' },
  activeLabel: { fontSize: 12, fontWeight: '600', color: '#245b3e' },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  statValue: {
    fontSize: 38,
    letterSpacing: -1,
    fontWeight: '500',
    color: '#172921',
  },
  statDivider: { width: 1, backgroundColor: '#e1e6df' },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 21,
    letterSpacing: -0.6,
    fontWeight: '600',
    color: '#172921',
  },
  sectionNumber: { fontSize: 12, color: '#7c897e' },
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e1e6df',
    borderRadius: 20,
    padding: 18,
    gap: 13,
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: '600',
    letterSpacing: -0.4,
    color: '#172921',
  },
  body: { fontSize: 15, lineHeight: 23, color: '#68756c' },
  bodyStrong: { fontSize: 15, fontWeight: '500', color: '#172921' },
  label: {
    fontSize: 10,
    letterSpacing: 1.3,
    fontWeight: '700',
    color: '#68756c',
  },
  input: {
    color: '#172921',
    fontSize: 16,
    backgroundColor: '#f6f7f4',
    borderWidth: 1,
    borderColor: '#e1e6df',
    borderRadius: 10,
    padding: 12,
  },
  noteInput: { minHeight: 84, textAlignVertical: 'top', lineHeight: 22 },
  exerciseSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  button: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: '#245b3e',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 13,
  },
  buttonLabel: { fontSize: 15, fontWeight: '600', color: '#fff' },
  buttonSecondary: { backgroundColor: '#e9eee5' },
  buttonSecondaryLabel: { color: '#245b3e' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
  sessionCard: {
    backgroundColor: '#172f23',
    borderRadius: 22,
    padding: 22,
    gap: 14,
  },
  sessionEyebrow: {
    fontSize: 10,
    letterSpacing: 1.4,
    color: '#b3c4af',
    fontWeight: '600',
  },
  sessionTitle: {
    color: '#fff',
    fontSize: 30,
    fontWeight: '500',
    letterSpacing: -1,
  },
  sessionNote: { color: '#c9d5c4', fontSize: 14, lineHeight: 22 },
  track: { height: 4, backgroundColor: '#435d48', borderRadius: 2 },
  progress: { height: 4, backgroundColor: '#b6dca4', borderRadius: 2 },
  setHeader: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  setRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  setHeading: {
    flex: 1,
    textAlign: 'center',
    fontSize: 10,
    letterSpacing: 1,
    color: '#68756c',
  },
  setIndex: { width: 38, textAlign: 'center', fontSize: 11, color: '#68756c' },
  setInput: {
    flex: 1,
    minWidth: 0,
    backgroundColor: '#f6f7f4',
    borderRadius: 10,
    paddingVertical: 13,
    textAlign: 'center',
    fontSize: 16,
    color: '#172921',
    borderWidth: 1,
    borderColor: '#e1e6df',
  },
  setComplete: { backgroundColor: '#edf4e9', borderColor: '#cbdcc0' },
  check: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f3ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: '#245b3e' },
  checkOn: { fontSize: 19, color: '#fff' },
  checkOff: { fontSize: 22, color: '#879982' },
  historyExercise: {
    gap: 5,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#edf0e9',
  },
  empty: { paddingVertical: 20, gap: 5 },
  loading: { padding: 30, alignItems: 'center', gap: 12 },
  error: { backgroundColor: '#fbece7', padding: 16, borderRadius: 14, gap: 12 },
  errorText: { fontSize: 14, color: '#913f32', lineHeight: 22 },
  notice: {
    backgroundColor: '#e3efda',
    padding: 15,
    borderRadius: 12,
    color: '#245b3e',
    fontSize: 14,
    lineHeight: 21,
  },
  footer: {
    fontSize: 10,
    letterSpacing: 1.1,
    lineHeight: 19,
    textAlign: 'center',
    color: '#879080',
    paddingTop: 25,
  },
});
