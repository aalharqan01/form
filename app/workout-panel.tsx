'use client';
import { useEffect, useState, useMemo } from 'react';
import {
  Plus,
  Check,
  X,
  Search,
  Dumbbell,
  Timer,
  Bookmark,
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
  type Exercise,
  type Routine,
  type Workout,
  type LiftSet,
  EXERCISES,
  id,
  volume,
  completedSets,
} from '@/lib/fitness';
type Props = {
  data: FitnessData;
  update: (fn: (d: FitnessData) => FitnessData) => void;
  onFinish: () => void;
};
export function RestTimer({ end, onEnd }: { end: number; onEnd: () => void }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const remaining = Math.max(0, Math.ceil((end - now) / 1000));
  return (
    <output className={`rest-island ${remaining === 0 ? 'rest-done' : ''}`}>
      <Timer size={21} />
      <div>
        <span>{remaining ? 'REST TIMER' : 'READY FOR YOUR NEXT SET'}</span>
        <strong>
          {remaining
            ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, '0')}`
            : 'Let’s go.'}
        </strong>
      </div>
      <Button
        variant="ghost"
        className="icon-button"
        aria-label="Dismiss rest timer"
        onClick={onEnd}
      >
        <X size={18} />
      </Button>
    </output>
  );
}
export function ExercisePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (name: string, muscle: string) => void;
}) {
  const [query, setQuery] = useState(''),
    [muscle, setMuscle] = useState('All');
  const list = EXERCISES.filter(
    ([n, m]) =>
      n.toLowerCase().includes(query.toLowerCase()) &&
      (muscle === 'All' || m === muscle),
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="form-dialog picker-dialog">
        <DialogTitle>Find your next exercise.</DialogTitle>
        <DialogDescription>
          Choose an exercise or add your own.
        </DialogDescription>
        <div className="search-input">
          <Search size={18} />
          <Input
            aria-label="Search exercises"
            placeholder="Search exercises"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            maxLength={100}
          />
        </div>
        <div className="muscle-filter">
          {['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'].map(
            (m) => (
              <button
                key={m}
                aria-pressed={muscle === m}
                onClick={() => setMuscle(m)}
              >
                {m}
              </button>
            ),
          )}
        </div>
        <div className="exercise-options">
          {list.map(([n, m]) => (
            <button
              key={n}
              onClick={() => {
                onPick(n, m);
                setQuery('');
              }}
            >
              <span className="exercise-icon">
                <Dumbbell size={21} strokeWidth={1.4} />
              </span>
              <span>
                <strong>{n}</strong>
                <small>{m}</small>
              </span>
              <Plus size={19} />
            </button>
          ))}
          {query.trim() &&
            !EXERCISES.some(
              ([n]) => n.toLowerCase() === query.trim().toLowerCase(),
            ) && (
              <button
                onClick={() => {
                  onPick(query.trim(), muscle === 'All' ? 'Custom' : muscle);
                  setQuery('');
                }}
              >
                <span className="exercise-icon">
                  <Plus size={21} />
                </span>
                <span>
                  <strong>Add “{query.trim()}”</strong>
                  <small>Custom exercise</small>
                </span>
              </button>
            )}
          {!list.length && !query.trim() && (
            <p>No exercises in this category.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function RoutineEditor({
  routine,
  open,
  onClose,
  onSave,
}: {
  routine: Routine | null;
  open: boolean;
  onClose: () => void;
  onSave: (r: Routine) => void;
}) {
  const [name, setName] = useState(routine?.name ?? ''),
    [exercises, setExercises] = useState<Routine['exercises']>(
      routine?.exercises ?? [],
    ),
    [pick, setPick] = useState(false),
    [error, setError] = useState('');

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) onClose();
        }}
      >
        <DialogContent className="form-dialog routine-dialog">
          <DialogTitle>
            {routine ? 'Edit routine' : 'Make it your routine.'}
          </DialogTitle>
          <DialogDescription>
            A little structure for your next session.
          </DialogDescription>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim() || !exercises.length) {
                setError('Name your routine and add at least one exercise.');
                return;
              }
              if (
                exercises.some(
                  (x) =>
                    !Number.isInteger(x.sets) ||
                    x.sets < 1 ||
                    x.sets > 50 ||
                    !Number.isInteger(x.reps) ||
                    x.reps < 1 ||
                    x.reps > 1000,
                )
              ) {
                setError('Use 1–50 sets and 1–1000 whole reps.');
                return;
              }
              onSave({ id: routine?.id ?? id(), name: name.trim(), exercises });
              onClose();
            }}
          >
            <label className="field-label">
              Routine name
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={100}
                required
                placeholder="e.g. Monday upper body"
              />
            </label>
            <div className="routine-edit-list">
              {exercises.map((x, i) => (
                <div className="routine-edit-item" key={`${x.name}-${i}`}>
                  <div>
                    <strong>{x.name}</strong>
                    <Button
                      type="button"
                      variant="ghost"
                      className="icon-button"
                      aria-label={`Remove ${x.name}`}
                      onClick={() =>
                        setExercises(exercises.filter((_, j) => j !== i))
                      }
                    >
                      <X size={17} />
                    </Button>
                  </div>
                  <div className="routine-targets">
                    <label>
                      Sets
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="50"
                        value={x.sets || ''}
                        onChange={(e) =>
                          setExercises(
                            exercises.map((v, j) =>
                              j === i
                                ? { ...v, sets: Number(e.target.value) }
                                : v,
                            ),
                          )
                        }
                      />
                    </label>
                    <label>
                      Reps
                      <Input
                        type="number"
                        inputMode="numeric"
                        min="1"
                        max="1000"
                        value={x.reps || ''}
                        onChange={(e) =>
                          setExercises(
                            exercises.map((v, j) =>
                              j === i
                                ? { ...v, reps: Number(e.target.value) }
                                : v,
                            ),
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <Button
              type="button"
              className="secondary full"
              disabled={exercises.length >= 60}
              onClick={() => setPick(true)}
            >
              <Plus size={18} />
              Add exercise
            </Button>
            {error && (
              <p className="error-text" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="primary full">
              Save routine{' '}
              <span className="button-orb">
                <Bookmark size={19} />
              </span>
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <ExercisePicker
        open={pick}
        onClose={() => setPick(false)}
        onPick={(n, m) => {
          setExercises((v) => [
            ...v,
            { name: n, muscle: m, sets: 3, reps: 10 },
          ]);
          setPick(false);
        }}
      />
    </>
  );
}
export default function WorkoutPanel({ data, update, onFinish }: Props) {
  const workout = data.active!;
  const [pick, setPick] = useState(false),
    [finish, setFinish] = useState(false),
    [discard, setDiscard] = useState(false),
    [error, setError] = useState(''),
    [restEnd, setRestEnd] = useState<number | null>(null),
    [saveRoutine, setSaveRoutine] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => {
      const end = Number(sessionStorage.getItem('form-rest'));
      if (end > Date.now()) setRestEnd(end);
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const setRest = (end: number | null) => {
    setRestEnd(end);
    if (end) sessionStorage.setItem('form-rest', String(end));
    else sessionStorage.removeItem('form-rest');
  };
  const change = (fn: (w: Workout) => Workout) =>
    update((d) => ({ ...d, active: d.active ? fn(d.active) : null }));
  function addExercise(n: string, m: string) {
    const previous = [...data.workouts]
      .reverse()
      .flatMap((w) => w.exercises)
      .find((e) => e.name === n);
    const sets =
      previous?.sets
        .filter((s) => s.done)
        .map((s) => ({ id: id(), kg: s.kg, reps: s.reps, done: false })) ??
      Array.from({ length: 3 }, () => ({
        id: id(),
        kg: '',
        reps: '10',
        done: false,
      }));
    change((w) => ({
      ...w,
      exercises: [
        ...w.exercises,
        {
          id: id(),
          name: n,
          muscle: m,
          sets: sets.length
            ? sets
            : [{ id: id(), kg: '', reps: '10', done: false }],
        },
      ],
    }));
    setPick(false);
  }
  function updateSet(eid: string, sid: string, patch: Partial<LiftSet>) {
    change((w) => ({
      ...w,
      exercises: w.exercises.map((e) =>
        e.id === eid
          ? {
              ...e,
              sets: e.sets.map((s) => (s.id === sid ? { ...s, ...patch } : s)),
            }
          : e,
      ),
    }));
  }
  function toggle(e: Exercise, s: LiftSet) {
    if (
      !s.done &&
      (s.kg === '' ||
        !Number.isFinite(Number(s.kg)) ||
        Number(s.kg) < 0 ||
        Number(s.kg) > 1500 ||
        !Number.isInteger(Number(s.reps)) ||
        Number(s.reps) < 1 ||
        Number(s.reps) > 1000)
    ) {
      setError(
        'Add a valid weight (0 for bodyweight) and whole reps before completing a set.',
      );
      return;
    }
    setError('');
    updateSet(e.id, s.id, { done: !s.done });
    if (!s.done && data.restSeconds)
      setRest(Date.now() + data.restSeconds * 1000);
  }
  const done = completedSets(workout),
    total = workout.exercises.reduce((a, e) => a + e.sets.length, 0);
  const routine: Routine = useMemo(
    () => ({
      id: id(),
      name: workout.name,
      exercises: workout.exercises.map((e) => ({
        name: e.name,
        muscle: e.muscle,
        sets: e.sets.length || 1,
        reps: Number(e.sets[0]?.reps) || 10,
      })),
    }),
    [workout.name, workout.exercises],
  );
  return (
    <>
      <div className="session-heading">
        <div>
          <p className="eyebrow">SESSION IN PROGRESS</p>
          <Input
            className="workout-name"
            aria-label="Workout name"
            maxLength={100}
            value={workout.name}
            onChange={(e) => change((w) => ({ ...w, name: e.target.value }))}
          />
        </div>
        <Button
          className="primary finish-button"
          onClick={() => {
            if (!done) {
              setError('Complete at least one set before finishing.');
              return;
            }
            setFinish(true);
          }}
        >
          Finish{' '}
          <span className="button-orb">
            <Check size={19} />
          </span>
        </Button>
      </div>
      <div className="session-metrics">
        <div>
          <span>COMPLETED</span>
          <strong>
            {done}
            <small> / {total} sets</small>
          </strong>
        </div>
        <div>
          <span>VOLUME</span>
          <strong>
            {volume(workout).toLocaleString()}
            <small> kg</small>
          </strong>
        </div>
        <div>
          <label htmlFor="rest-select">REST TIMER</label>
          <select
            id="rest-select"
            value={data.restSeconds}
            onChange={(e) =>
              update((d) => ({ ...d, restSeconds: Number(e.target.value) }))
            }
          >
            {[
              [0, 'Off'],
              [30, '30 seconds'],
              [60, '1 minute'],
              [90, '1 min 30 sec'],
              [120, '2 minutes'],
              [180, '3 minutes'],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          {error}
          <button onClick={() => setError('')} aria-label="Dismiss">
            <X size={17} />
          </button>
        </div>
      )}
      <div className="workout-exercises">
        {workout.exercises.map((e, ei) => {
          const previous = [...data.workouts]
            .reverse()
            .flatMap((w) => w.exercises)
            .find((x) => x.name === e.name)
            ?.sets.filter((s) => s.done);
          return (
            <section className="bezel exercise-bezel" key={e.id}>
              <div className="card">
                <div className="exercise-header">
                  <span className="exercise-number">
                    {String(ei + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h2>{e.name}</h2>
                    <p>{e.muscle}</p>
                  </div>
                  <Button
                    variant="ghost"
                    className="icon-button"
                    aria-label={`Remove ${e.name}`}
                    onClick={() => {
                      if (
                        e.sets.some((s) => s.done) &&
                        !window.confirm(
                          `Remove ${e.name} and its completed sets from this session?`,
                        )
                      )
                        return;
                      change((w) => ({
                        ...w,
                        exercises: w.exercises.filter((x) => x.id !== e.id),
                      }));
                    }}
                  >
                    <X size={19} />
                  </Button>
                </div>
                <div className="set-grid set-labels">
                  <span>SET</span>
                  <span>PREVIOUS</span>
                  <span>KG</span>
                  <span>REPS</span>
                  <span>DONE</span>
                </div>
                {e.sets.map((s, si) => (
                  <div
                    className={`set-grid ${s.done ? 'set-done' : ''}`}
                    key={s.id}
                  >
                    <button
                      className="set-number"
                      aria-label={`Remove set ${si + 1} from ${e.name}`}
                      title="Remove set"
                      onClick={() => {
                        if (
                          s.done &&
                          !window.confirm('Remove this completed set?')
                        )
                          return;
                        change((w) => ({
                          ...w,
                          exercises: w.exercises.map((x) =>
                            x.id === e.id
                              ? {
                                  ...x,
                                  sets: x.sets.filter((v) => v.id !== s.id),
                                }
                              : x,
                          ),
                        }));
                      }}
                    >
                      {si + 1}
                    </button>
                    <span className="previous-set">
                      {previous?.[si]
                        ? `${previous[si].kg} × ${previous[si].reps}`
                        : '—'}
                    </span>
                    <Input
                      aria-label={`${e.name} set ${si + 1} weight in kilograms`}
                      inputMode="decimal"
                      type="number"
                      min="0"
                      max="1500"
                      step="0.25"
                      placeholder="0"
                      value={s.kg}
                      onChange={(v) =>
                        updateSet(e.id, s.id, {
                          kg: v.target.value,
                          done: false,
                        })
                      }
                    />
                    <Input
                      aria-label={`${e.name} set ${si + 1} reps`}
                      inputMode="numeric"
                      type="number"
                      min="1"
                      max="1000"
                      placeholder="10"
                      value={s.reps}
                      onChange={(v) =>
                        updateSet(e.id, s.id, {
                          reps: v.target.value,
                          done: false,
                        })
                      }
                    />
                    <button
                      className="check-set"
                      aria-pressed={s.done}
                      aria-label={`Complete ${e.name} set ${si + 1}`}
                      onClick={() => toggle(e, s)}
                    >
                      <Check size={20} />
                    </button>
                  </div>
                ))}
                <Button
                  className="add-set"
                  disabled={e.sets.length >= 50}
                  onClick={() =>
                    change((w) => ({
                      ...w,
                      exercises: w.exercises.map((x) =>
                        x.id === e.id
                          ? {
                              ...x,
                              sets: [
                                ...x.sets,
                                {
                                  id: id(),
                                  kg: x.sets.at(-1)?.kg ?? '',
                                  reps: x.sets.at(-1)?.reps ?? '10',
                                  done: false,
                                },
                              ],
                            }
                          : x,
                      ),
                    }))
                  }
                >
                  <Plus size={16} />
                  Add set
                </Button>
              </div>
            </section>
          );
        })}
      </div>
      {!workout.exercises.length && (
        <section className="session-empty">
          <Dumbbell size={42} strokeWidth={1.2} />
          <h2>Your session starts here.</h2>
          <p>Add your first exercise. We’ll take care of the log.</p>
        </section>
      )}
      <Button
        className="secondary full add-exercise"
        disabled={workout.exercises.length >= 60}
        onClick={() => setPick(true)}
      >
        <Plus size={19} />
        Add exercise
      </Button>
      <label className="field-label session-notes">
        Session notes <span>optional</span>
        <textarea
          value={workout.notes}
          onChange={(e) => change((w) => ({ ...w, notes: e.target.value }))}
          maxLength={2000}
          placeholder="How did it feel? Anything to remember next time?"
          rows={3}
        />
      </label>
      <div className="session-actions">
        <Button
          className="text-button"
          disabled={!workout.exercises.length || data.routines.length >= 100}
          onClick={() => setSaveRoutine(true)}
        >
          <Bookmark size={17} />
          Save as routine
        </Button>
        <Button
          className="text-button muted-danger"
          onClick={() => setDiscard(true)}
        >
          Discard session
        </Button>
      </div>
      <ExercisePicker
        open={pick}
        onClose={() => setPick(false)}
        onPick={addExercise}
      />
      <Dialog open={finish} onOpenChange={setFinish}>
        <DialogContent className="form-dialog">
          <div className="success-mark">
            <Check size={30} />
          </div>
          <DialogTitle>Another session, in the books.</DialogTitle>
          <DialogDescription>
            {done} completed sets · {volume(workout).toLocaleString()} kg total
            volume. Unchecked sets won’t be included in your history.
          </DialogDescription>
          <Button
            className="primary full"
            onClick={() => {
              const finished = {
                ...workout,
                name: workout.name.trim() || 'Workout',
                finishedAt: new Date().toISOString(),
                exercises: workout.exercises
                  .map((e) => ({ ...e, sets: e.sets.filter((s) => s.done) }))
                  .filter((e) => e.sets.length),
              };
              update((d) => ({
                ...d,
                workouts: [...d.workouts, finished],
                active: null,
              }));
              setRest(null);
              onFinish();
            }}
          >
            Save workout{' '}
            <span className="button-orb">
              <Check size={19} />
            </span>
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={discard} onOpenChange={setDiscard}>
        <DialogContent className="form-dialog">
          <DialogTitle>Discard this session?</DialogTitle>
          <DialogDescription>
            This removes the current session and its sets. Your finished
            workouts stay in your history.
          </DialogDescription>
          <Button
            className="danger-button"
            onClick={() => {
              update((d) => ({ ...d, active: null }));
              setRest(null);
            }}
          >
            Discard session
          </Button>
        </DialogContent>
      </Dialog>
      {saveRoutine && (
        <RoutineEditor
          open={saveRoutine}
          routine={saveRoutine ? routine : null}
          onClose={() => setSaveRoutine(false)}
          onSave={(r) =>
            update((d) => ({
              ...d,
              routines: [...d.routines, { ...r, id: id() }],
            }))
          }
        />
      )}
      {restEnd && <RestTimer end={restEnd} onEnd={() => setRest(null)} />}
    </>
  );
}
