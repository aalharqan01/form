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
import { ALL_EXERCISES, EQUIPMENT_OPTIONS } from '@/lib/exercises';
import ExerciseThumbnail, { ExerciseCredits } from './exercise-thumbnail';
import ExerciseVideo from './exercise-video';
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
  id,
  volume,
  completedSets,
  lastPerformance,
  displayWeight,
  toKg,
} from '@/lib/fitness';
type Props = {
  restStorageKey?: string;
  data: FitnessData;
  update: (fn: (d: FitnessData) => FitnessData) => void;
  onFinish: () => void;
};
export function RestTimer({
  end,
  onEnd,
  onAdjust,
}: {
  end: number;
  onEnd: () => void;
  onAdjust: (seconds: number) => void;
}) {
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
            : 'Rest complete'}
        </strong>
      </div>
      <div className="rest-adjust">
        <button
          aria-label="Reduce rest by 15 seconds"
          onClick={() => onAdjust(-15)}
        >
          −15s
        </button>
        <button
          aria-label="Increase rest by 15 seconds"
          onClick={() => onAdjust(15)}
        >
          +15s
        </button>
      </div>
      <Button
        variant="ghost"
        className="icon-button"
        aria-label="Skip rest timer"
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
    [muscle, setMuscle] = useState('All'),
    [equipment, setEquipment] = useState('All');
  const list = ALL_EXERCISES.filter(
    ([n, m, eq]) =>
      `${n} ${m} ${eq}`.toLowerCase().includes(query.trim().toLowerCase()) &&
      (muscle === 'All' || m === muscle) &&
      (equipment === 'All' || eq === equipment),
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="form-dialog picker-dialog">
        <DialogTitle>Add exercise</DialogTitle>
        <DialogDescription>
          {ALL_EXERCISES.length} exercises. Filter by muscle and equipment, or
          add your own.
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
          {[
            'All',
            'Chest',
            'Back',
            'Legs',
            'Shoulders',
            'Arms',
            'Core',
            'Full body',
          ].map((m) => (
            <button
              type="button"
              key={m}
              aria-pressed={muscle === m}
              onClick={() => setMuscle(m)}
            >
              {m}
            </button>
          ))}
        </div>
        <label className="exercise-equipment">
          Equipment
          <select
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
          >
            {['All', ...EQUIPMENT_OPTIONS].map((e) => (
              <option key={e} value={e}>
                {e === 'All' ? 'All equipment' : e}
              </option>
            ))}
          </select>
        </label>
        <ExerciseCredits />
        <p className="exercise-results" aria-live="polite">
          {list.length} exercises found
        </p>
        <div className="exercise-options">
          {!list.length && (
            <p className="co-muted">
              No matches. Try another search or change the filters.
            </p>
          )}
          {list.map(([n, m, eq]) => (
            <button
              type="button"
              key={n}
              onClick={() => {
                onPick(n, m);
                setQuery('');
              }}
            >
              <ExerciseThumbnail name={n} />
              <span>
                <strong>{n}</strong>
                <small>
                  {m} · {eq}
                </small>
              </span>
              <Plus size={19} />
            </button>
          ))}
          {query.trim() &&
            !ALL_EXERCISES.some(
              ([n]) => n.toLowerCase() === query.trim().toLowerCase(),
            ) && (
              <button
                type="button"
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
            {routine ? 'Edit routine' : 'Create routine'}
          </DialogTitle>
          <DialogDescription>Set exercises and targets.</DialogDescription>
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
                    (x.reps !== undefined &&
                      (!Number.isInteger(x.reps) ||
                        x.reps < 1 ||
                        x.reps > 1000)),
                )
              ) {
                setError('Use 1-50 sets and, when given, 1-1000 whole reps.');
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
                    <ExerciseThumbnail name={x.name} />
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
                      Unit
                      <select
                        aria-label={`Unit for ${x.name}`}
                        value={x.unit ?? 'kg'}
                        onChange={(e) =>
                          setExercises(
                            exercises.map((v, j) =>
                              j === i
                                ? { ...v, unit: e.target.value as 'kg' | 'lb' }
                                : v,
                            ),
                          )
                        }
                      >
                        <option value="kg">kg</option>
                        <option value="lb">lb</option>
                      </select>
                    </label>
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
export default function WorkoutPanel({
  data,
  update,
  onFinish,
  restStorageKey = 'form-rest',
}: Props) {
  const workout = data.active!;
  const [pick, setPick] = useState(false),
    [finish, setFinish] = useState(false),
    [discard, setDiscard] = useState(false),
    [error, setError] = useState(''),
    [restEnd, setRestEnd] = useState<number | null>(null),
    [saveRoutine, setSaveRoutine] = useState(false),
    [focus, setFocus] = useState(false),
    [focusIndex, setFocusIndex] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => {
      const end = Number(sessionStorage.getItem(restStorageKey));
      if (end > Date.now()) setRestEnd(end);
    }, 0);
    return () => clearTimeout(t);
  }, [restStorageKey]);
  const setRest = (end: number | null) => {
    setRestEnd(end);
    if (end) sessionStorage.setItem(restStorageKey, String(end));
    else sessionStorage.removeItem(restStorageKey);
  };
  const change = (fn: (w: Workout) => Workout) =>
    update((d) => ({ ...d, active: d.active ? fn(d.active) : null }));
  function addExercise(name: string, muscle: string) {
    const previous = lastPerformance(data.workouts, name);
    change((w) => ({
      ...w,
      exercises: [
        ...w.exercises,
        {
          id: id(),
          name,
          muscle,
          unit: 'kg',
          sets: previous?.length
            ? previous.map((s) => ({
                id: id(),
                kg: s.kg,
                reps: s.reps,
                kind: 'working',
                done: false,
              }))
            : Array.from({ length: 3 }, () => ({
                id: id(),
                kg: '',
                reps: '10',
                kind: 'working',
                done: false,
              })),
        },
      ],
    }));
    setFocusIndex(workout.exercises.length);
    setPick(false);
  }
  function changeSet(eid: string, sid: string, patch: Partial<LiftSet>) {
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
  const loadValue = (s: LiftSet, unit: 'kg' | 'lb') =>
    s.load ??
    (s.kg === ''
      ? ''
      : String(Number(displayWeight(Number(s.kg), unit).toFixed(2))));
  function setLoad(e: Exercise, s: LiftSet, raw: string) {
    changeSet(e.id, s.id, {
      load: raw,
      kg: raw === '' ? '' : String(toKg(Number(raw), e.unit ?? 'kg')),
      done: false,
    });
  }
  function setUnit(e: Exercise, unit: 'kg' | 'lb') {
    change((w) => ({
      ...w,
      exercises: w.exercises.map((x) =>
        x.id === e.id
          ? {
              ...x,
              unit,
              sets: x.sets.map((s) => ({
                ...s,
                load:
                  s.kg === ''
                    ? ''
                    : String(
                        Number(displayWeight(Number(s.kg), unit).toFixed(2)),
                      ),
              })),
            }
          : x,
      ),
    }));
  }
  function complete(e: Exercise, s: LiftSet) {
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
      setError('Enter a weight (0 for bodyweight) and whole reps.');
      return;
    }
    setError('');
    changeSet(e.id, s.id, { done: !s.done });
    if (!s.done && data.restSeconds)
      setRest(Date.now() + data.restSeconds * 1000);
  }
  function addSet(e: Exercise, kind: 'working' | 'warmup') {
    const last = e.sets.filter((s) => s.kind !== 'warmup').at(-1);
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
                  kg: kind === 'warmup' ? '' : (last?.kg ?? ''),
                  reps: last?.reps ?? '10',
                  kind,
                  done: false,
                },
              ],
            }
          : x,
      ),
    }));
  }
  const done = completedSets(workout),
    total = workout.exercises.reduce((n, e) => n + e.sets.length, 0),
    index = Math.min(focusIndex, Math.max(0, workout.exercises.length - 1));
  const routine: Routine = useMemo(
    () => ({
      id: id(),
      name: workout.name,
      exercises: workout.exercises.map((e) => ({
        name: e.name,
        muscle: e.muscle,
        unit: e.unit,
        sets: e.sets.filter((s) => s.kind !== 'warmup').length || 1,
        reps: Number(e.sets.find((s) => s.kind !== 'warmup')?.reps) || 10,
      })),
    }),
    [workout],
  );
  return (
    <div className={`active-workout ${focus ? 'focus-session' : ''}`}>
      <div className="session-heading">
        <div>
          <p className="eyebrow">ACTIVE WORKOUT</p>
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
              setError('Complete at least one set first.');
              return;
            }
            setFinish(true);
          }}
        >
          Finish
          <span className="button-orb">
            <Check size={19} />
          </span>
        </Button>
      </div>
      <div className="session-mode">
        <div className="range-switch">
          <button aria-pressed={focus} onClick={() => setFocus(true)}>
            Focus
          </button>
          <button aria-pressed={!focus} onClick={() => setFocus(false)}>
            All exercises
          </button>
        </div>
        <label>
          Rest
          <select
            aria-label="Rest duration"
            value={data.restSeconds}
            onChange={(e) =>
              update((d) => ({ ...d, restSeconds: Number(e.target.value) }))
            }
          >
            {[
              [0, 'Off'],
              [30, '30s'],
              [60, '60s'],
              [90, '90s'],
              [120, '2 min'],
              [180, '3 min'],
              [240, '4 min'],
              [300, '5 min'],
            ].map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <span>
          {done}/{total} sets
        </span>
      </div>
      {error && (
        <div className="error-banner" role="alert">
          {error}
          <button aria-label="Dismiss" onClick={() => setError('')}>
            <X size={17} />
          </button>
        </div>
      )}
      {focus && workout.exercises.length > 0 && (
        <div className="exercise-pager">
          <Button
            className="text-button"
            disabled={index === 0}
            onClick={() => setFocusIndex(index - 1)}
          >
            Previous
          </Button>
          <span>
            Exercise {index + 1} of {workout.exercises.length}
          </span>
          <Button
            className="text-button"
            disabled={index === workout.exercises.length - 1}
            onClick={() => setFocusIndex(index + 1)}
          >
            Next
          </Button>
        </div>
      )}
      <div className="workout-exercises">
        {workout.exercises.map((e, ei) => {
          if (focus && ei !== index) return null;
          const unit = e.unit ?? 'kg',
            previous = lastPerformance(data.workouts, e.name);
          return (
            <section className="bezel exercise-bezel" key={e.id}>
              <div className="card">
                <div className="exercise-header">
                  <ExerciseThumbnail name={e.name} />
                  <div>
                    <h2>{e.name}</h2>
                    <p>{e.muscle}</p>
                  </div>
                  <select
                    className="exercise-unit"
                    aria-label={`Weight unit for ${e.name}`}
                    value={unit}
                    onChange={(v) => setUnit(e, v.target.value as 'kg' | 'lb')}
                  >
                    <option value="kg">kg</option>
                    <option value="lb">lb</option>
                  </select>
                  <Button
                    variant="ghost"
                    className="icon-button"
                    aria-label={`Remove ${e.name}`}
                    onClick={() => {
                      if (
                        e.sets.some((s) => s.done) &&
                        !window.confirm(
                          'Remove this exercise and its completed sets?',
                        )
                      )
                        return;
                      change((w) => ({
                        ...w,
                        exercises: w.exercises.filter((v) => v.id !== e.id),
                      }));
                    }}
                  >
                    <X size={18} />
                  </Button>
                </div>
                {e.instructions && (
                  <p className="co-program-note">{e.instructions}</p>
                )}
                {e.videoUrl && <ExerciseVideo url={e.videoUrl} name={e.name} />}
                {previous?.length ? (
                  <div className="previous-performance">
                    <span>
                      Last time:{' '}
                      {previous
                        .map(
                          (s) =>
                            `${displayWeight(Number(s.kg), unit).toLocaleString(undefined, { maximumFractionDigits: 2 })} × ${s.reps}`,
                        )
                        .join(' · ')}{' '}
                      {unit}
                    </span>
                    <Button
                      className="text-button"
                      disabled={e.sets.some((s) => s.done)}
                      onClick={() =>
                        change((w) => ({
                          ...w,
                          exercises: w.exercises.map((v) =>
                            v.id === e.id
                              ? {
                                  ...v,
                                  sets: previous.map((s) => ({
                                    id: id(),
                                    kg: s.kg,
                                    reps: s.reps,
                                    kind: 'working',
                                    done: false,
                                  })),
                                }
                              : v,
                          ),
                        }))
                      }
                    >
                      Copy last
                    </Button>
                  </div>
                ) : null}
                <div className="fast-set-labels">
                  <span>SET</span>
                  <span>{unit.toUpperCase()}</span>
                  <span>REPS</span>
                  <span>DONE</span>
                </div>
                {e.sets.map((s, si) => (
                  <div
                    className={`fast-set ${s.done ? 'set-done' : ''} ${s.kind === 'warmup' ? 'warmup-set' : ''}`}
                    key={s.id}
                  >
                    <div className="set-type">
                      <select
                        aria-label={`Set ${si + 1} type`}
                        value={s.kind ?? 'working'}
                        onChange={(v) =>
                          changeSet(e.id, s.id, {
                            kind: v.target.value as 'working' | 'warmup',
                          })
                        }
                      >
                        <option value="working">{si + 1}</option>
                        <option value="warmup">W</option>
                      </select>
                      <button
                        className="remove-set"
                        aria-label={`Remove set ${si + 1}`}
                        onClick={() => {
                          if (
                            s.done &&
                            !window.confirm('Remove this completed set?')
                          )
                            return;
                          change((w) => ({
                            ...w,
                            exercises: w.exercises.map((v) =>
                              v.id === e.id
                                ? {
                                    ...v,
                                    sets: v.sets.filter((x) => x.id !== s.id),
                                  }
                                : v,
                            ),
                          }));
                        }}
                      >
                        ×
                      </button>
                    </div>
                    <div className="number-stepper">
                      <Input
                        aria-label={`${e.name} set ${si + 1} weight in ${unit}`}
                        inputMode="decimal"
                        type="number"
                        min="0"
                        step="any"
                        value={loadValue(s, unit)}
                        placeholder="0"
                        onChange={(v) => setLoad(e, s, v.target.value)}
                      />
                      <div>
                        <button
                          aria-label={`Decrease set ${si + 1} weight`}
                          onClick={() =>
                            setLoad(
                              e,
                              s,
                              String(
                                Math.max(
                                  0,
                                  Number(loadValue(s, unit)) -
                                    (unit === 'kg' ? 2.5 : 5),
                                ),
                              ),
                            )
                          }
                        >
                          −
                        </button>
                        <span>{unit === 'kg' ? '2.5' : '5'}</span>
                        <button
                          aria-label={`Increase set ${si + 1} weight`}
                          onClick={() =>
                            setLoad(
                              e,
                              s,
                              String(
                                Number(loadValue(s, unit)) +
                                  (unit === 'kg' ? 2.5 : 5),
                              ),
                            )
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="number-stepper">
                      <Input
                        aria-label={`${e.name} set ${si + 1} reps`}
                        inputMode="numeric"
                        type="number"
                        min="1"
                        step="1"
                        value={s.reps}
                        onChange={(v) =>
                          changeSet(e.id, s.id, {
                            reps: v.target.value,
                            done: false,
                          })
                        }
                      />
                      <div>
                        <button
                          aria-label={`Decrease set ${si + 1} reps`}
                          onClick={() =>
                            changeSet(e.id, s.id, {
                              reps: String(Math.max(1, Number(s.reps) - 1)),
                              done: false,
                            })
                          }
                        >
                          −
                        </button>
                        <span>1</span>
                        <button
                          aria-label={`Increase set ${si + 1} reps`}
                          onClick={() =>
                            changeSet(e.id, s.id, {
                              reps: String(Math.min(1000, Number(s.reps) + 1)),
                              done: false,
                            })
                          }
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      className="check-set"
                      aria-pressed={s.done}
                      aria-label={`Complete ${e.name} set ${si + 1}`}
                      onClick={() => complete(e, s)}
                    >
                      <Check size={22} />
                    </button>
                  </div>
                ))}
                <div className="add-set-actions">
                  <Button
                    className="add-set"
                    disabled={e.sets.length >= 50}
                    onClick={() => addSet(e, 'working')}
                  >
                    <Plus size={16} />
                    Working set
                  </Button>
                  <Button
                    className="add-set"
                    disabled={e.sets.length >= 50}
                    onClick={() => addSet(e, 'warmup')}
                  >
                    <Plus size={16} />
                    Warm-up
                  </Button>
                </div>
              </div>
            </section>
          );
        })}
      </div>
      {!workout.exercises.length && (
        <section className="session-empty">
          <Dumbbell size={36} strokeWidth={1.4} />
          <h2>No exercises yet</h2>
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
      <ExerciseCredits />
      <details className="session-extra">
        <summary>Notes and session options</summary>
        <label className="field-label session-notes">
          Notes
          <textarea
            rows={3}
            maxLength={2000}
            value={workout.notes}
            onChange={(e) => change((w) => ({ ...w, notes: e.target.value }))}
          />
        </label>
        <div className="session-actions">
          <Button
            className="text-button"
            disabled={!workout.exercises.length || data.routines.length >= 100}
            onClick={() => setSaveRoutine(true)}
          >
            <Bookmark size={16} />
            Save routine
          </Button>
          <Button
            className="text-button muted-danger"
            onClick={() => setDiscard(true)}
          >
            Discard workout
          </Button>
        </div>
      </details>
      <ExercisePicker
        open={pick}
        onClose={() => setPick(false)}
        onPick={addExercise}
      />
      <Dialog open={finish} onOpenChange={setFinish}>
        <DialogContent className="form-dialog">
          <DialogTitle>Finish workout?</DialogTitle>
          <DialogDescription>
            {done} completed sets ·{' '}
            {volume(workout).toLocaleString(undefined, {
              maximumFractionDigits: 1,
            })}{' '}
            kg total volume. Only completed sets are saved.
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
            Save workout
            <Check size={19} />
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={discard} onOpenChange={setDiscard}>
        <DialogContent className="form-dialog">
          <DialogTitle>Discard workout?</DialogTitle>
          <DialogDescription>
            This removes the active workout and its sets.
          </DialogDescription>
          <Button
            className="danger-button"
            onClick={() => {
              update((d) => ({ ...d, active: null }));
              setRest(null);
            }}
          >
            Discard
          </Button>
        </DialogContent>
      </Dialog>
      {saveRoutine && (
        <RoutineEditor
          routine={routine}
          open={saveRoutine}
          onClose={() => setSaveRoutine(false)}
          onSave={(r) =>
            update((d) => ({
              ...d,
              routines: [...d.routines, { ...r, id: id() }],
            }))
          }
        />
      )}
      {restEnd && (
        <RestTimer
          end={restEnd}
          onEnd={() => setRest(null)}
          onAdjust={(seconds) =>
            setRest(Math.max(Date.now(), restEnd) + seconds * 1000)
          }
        />
      )}
    </div>
  );
}
