import type { Program } from './coaching';
import type { Workout } from './fitness.ts';
import { resumeWorkout, toKg } from './fitness.ts';

export function foundationProgram(
  title = 'Strength A',
  notes = 'Leave two reps in reserve. Move with control.',
  now = new Date(),
): Program {
  return {
    title,
    notes,
    startDate: now.toISOString().slice(0, 10),
    sessions: [
      {
        id: 'foundation-a',
        name: title,
        day: now.getUTCDay(),
        exercises: [
          {
            name: 'Bench press',
            muscle: 'Chest',
            sets: 2,
            reps: 8,
            unit: 'kg',
          },
          {
            name: 'Seated cable row',
            muscle: 'Back',
            sets: 2,
            reps: 10,
            unit: 'kg',
          },
        ],
      },
    ],
  };
}

export function startAssignedWorkout(
  program: Program,
  membershipId: string,
  id: () => string,
  now = new Date(),
): Workout {
  const session = program.sessions[0];
  if (!session) throw new Error('No session has been assigned yet.');
  return {
    id: id(),
    name: session.name,
    membershipId,
    programSessionId: session.id,
    startedAt: now.toISOString(),
    notes: '',
    exercises: session.exercises.map((exercise) => ({
      id: id(),
      name: exercise.name,
      muscle: exercise.muscle,
      unit: exercise.unit ?? 'kg',
      instructions: exercise.instructions,
      videoUrl: exercise.videoUrl,
      restSeconds: exercise.restSeconds ?? 90,
      sets: Array.from({ length: exercise.sets }, () => ({
        id: id(),
        kg: '',
        load: '',
        reps: String(exercise.reps),
        done: false,
        kind: 'working' as const,
      })),
    })),
  };
}

export function editWorkoutSet(
  workout: Workout,
  exerciseId: string,
  setId: string,
  patch: { load?: string; reps?: string; done?: boolean },
): Workout {
  return {
    ...workout,
    exercises: workout.exercises.map((exercise) =>
      exercise.id !== exerciseId
        ? exercise
        : {
            ...exercise,
            sets: exercise.sets.map((set) => {
              if (set.id !== setId) return set;
              const updated = { ...set, ...patch };
              if (patch.load !== undefined)
                updated.kg =
                  patch.load === ''
                    ? ''
                    : String(toKg(Number(patch.load), exercise.unit ?? 'kg'));
              if (
                updated.done &&
                (!Number.isFinite(Number(updated.kg)) ||
                  updated.kg === '' ||
                  Number(updated.kg) < 0 ||
                  !Number.isInteger(Number(updated.reps)) ||
                  Number(updated.reps) < 1)
              )
                throw new Error(
                  'Enter a valid weight and rep count before completing this set.',
                );
              return updated;
            }),
          },
    ),
  };
}

export function finishAssignedWorkout(
  workout: Workout,
  now = new Date(),
): Workout {
  const sets = workout.exercises.flatMap((exercise) => exercise.sets);
  if (!sets.some((set) => set.done))
    throw new Error('Log at least one set, or discard the empty workout.');
  return {
    ...resumeWorkout(workout, now),
    endedEarly: sets.some((set) => !set.done),
    finishedAt: now.toISOString(),
  };
}
