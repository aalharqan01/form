import { randomUUID } from 'expo-crypto';
import {
  displayWeight,
  lastPerformance,
  type FitnessData,
  type LiftSet,
  type Routine,
  type Workout,
} from '../../../lib/fitness';
import { startTraining } from '../../../lib/training';

export type Act = (action: () => Promise<unknown>, notice?: string) => void;
export type Tab = 'train' | 'weight' | 'history' | 'coach';

export const loadValue = (set: LiftSet, unit: 'kg' | 'lb') =>
  set.load ??
  (set.kg === ''
    ? ''
    : String(Number(displayWeight(Number(set.kg), unit).toFixed(2))));

// Personal routines pre-fill each set from the last logged performance, as the
// web tracker does. Coach-assigned sessions keep the coach's targets instead.
export function startWorkout(
  data: FitnessData,
  routine: Routine | null,
  membershipId?: string,
): Workout {
  const workout = startTraining(routine, randomUUID, membershipId);
  if (membershipId) return workout;
  return {
    ...workout,
    exercises: workout.exercises.map((exercise) => {
      const previous = lastPerformance(data.workouts, exercise.name);
      const unit = exercise.unit ?? 'kg';
      return {
        ...exercise,
        sets: exercise.sets.map((set, i) => {
          const before = previous?.[i];
          if (!before) return set;
          return {
            ...set,
            kg: before.kg,
            load: loadValue({ ...set, kg: before.kg, load: undefined }, unit),
            reps: before.reps || set.reps,
          };
        }),
      };
    }),
  };
}

export const kgText = (kg: number, unit: 'kg' | 'lb', digits = 1) =>
  displayWeight(kg, unit).toFixed(digits);

export function signedKg(
  kg: number | null | undefined,
  unit: 'kg' | 'lb',
  digits = 2,
) {
  if (kg == null) return '—';
  const value = displayWeight(kg, unit);
  return `${value > 0 ? '+' : ''}${value.toFixed(digits)} ${unit}`;
}

export function minutesOf(workout: Workout) {
  return Math.max(
    1,
    Math.round(
      (Date.parse(workout.finishedAt ?? workout.startedAt) -
        Date.parse(workout.startedAt)) /
        60000,
    ),
  );
}

export const skippedSets = (workout: Workout) =>
  workout.exercises.flatMap((e) => e.sets).filter((s) => !s.done).length;

export function duration(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

export function restLabel(seconds: number | undefined) {
  const value = seconds ?? 90;
  if (value === 0) return 'Off';
  if (value < 60) return `${value}s`;
  if (value % 60 === 0) return `${value / 60} min`;
  return duration(value);
}
