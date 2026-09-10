import {
  displayWeight,
  type Routine,
  type Workout,
  type Exercise,
} from './fitness.ts';
export function startTraining(
  routine: Routine | null,
  id: () => string,
  membershipId?: string,
  now = new Date(),
): Workout {
  return {
    id: id(),
    name: routine?.name ?? 'Personal workout',
    startedAt: now.toISOString(),
    notes: '',
    ...(membershipId ? { membershipId, programSessionId: routine?.id } : {}),
    exercises: (routine?.exercises ?? []).map((e) => ({
      id: id(),
      name: e.name,
      muscle: e.muscle,
      unit: e.unit ?? 'kg',
      restSeconds: e.restSeconds ?? 90,
      instructions: e.instructions,
      videoUrl: e.videoUrl,
      sets: Array.from({ length: e.sets }, () => ({
        id: id(),
        kg: '',
        load: '',
        reps: String(e.reps),
        done: false,
        kind: 'working' as const,
      })),
    })),
  };
}
export function changeExerciseUnit(
  exercise: Exercise,
  unit: 'kg' | 'lb',
): Exercise {
  return {
    ...exercise,
    unit,
    sets: exercise.sets.map((set) => ({
      ...set,
      load:
        set.kg === ''
          ? ''
          : String(Math.round(displayWeight(Number(set.kg), unit) * 100) / 100),
    })),
  };
}
export function routineFromWorkout(
  workout: Workout,
  id: string,
  name: string,
): Routine {
  return {
    id,
    name,
    exercises: workout.exercises.map((e) => ({
      name: e.name,
      muscle: e.muscle,
      unit: e.unit ?? 'kg',
      restSeconds: e.restSeconds ?? 90,
      instructions: e.instructions,
      videoUrl: e.videoUrl,
      sets: Math.max(1, e.sets.length),
      reps: Math.max(
        1,
        Number(e.sets.find((s) => Number(s.reps) > 0)?.reps) || 10,
      ),
    })),
  };
}
export function restRemaining(end: number | null, now = Date.now()) {
  return end === null ? 0 : Math.max(0, Math.ceil((end - now) / 1000));
}
