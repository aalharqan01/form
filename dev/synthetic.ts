import {
  EMPTY,
  STARTERS,
  validateData,
  type FitnessData,
  type Routine,
  type Workout,
} from '../lib/fitness.ts';
import type { Program } from '../lib/coaching.ts';

// Deterministic sample history for the local fixtures. Every run produces the
// same log for a given seed, so screenshots and manual checks stay comparable.
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
const round = (n: number, step = 0.1) =>
  Number((Math.round(n / step) * step).toFixed(2));
const dayKey = (d: Date) => d.toISOString().slice(0, 10);
const startOfUtcDay = (d: Date) =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

// Kilogram starting loads by exercise name; anything unlisted starts light.
const BASE_KG: Record<string, number> = {
  'Bench press': 42.5,
  'Lat pulldown': 45,
  'Shoulder press': 25,
  'Seated cable row': 40,
  'Biceps curl': 10,
  'Barbell squat': 60,
  'Romanian deadlift': 55,
  'Leg extension': 35,
  'Seated leg curl': 30,
  'Standing calf raise': 40,
  'Goblet squat': 20,
  'Dumbbell bench press': 18,
};
const compound = new Set([
  'Bench press',
  'Barbell squat',
  'Romanian deadlift',
  'Seated cable row',
  'Lat pulldown',
]);

type Session = { id?: string; name: string; exercises: Routine['exercises'] };
function workoutFor(
  random: () => number,
  session: Session,
  start: Date,
  week: number,
  options: { membershipId?: string; endedEarly?: boolean } = {},
): Workout {
  const id = () =>
    `${dayKey(start)}-${Math.floor(random() * 1e9).toString(36)}`;
  const exercises = session.exercises.map((e, index) => {
    const base = BASE_KG[e.name] ?? 15;
    const step = compound.has(e.name) ? 2.5 : 1.25;
    const kg = round(base + step * Math.floor(week / 2), 1.25);
    const sets = Array.from({ length: e.sets }, (_, i) => {
      const last = i === e.sets - 1;
      const skipped =
        options.endedEarly && index >= session.exercises.length - 1 && i > 0;
      const reps = last && random() < 0.35 ? e.reps - 1 : e.reps;
      return {
        id: id(),
        kg: skipped ? '' : String(kg),
        reps: String(reps),
        done: !skipped,
        kind: 'working' as const,
      };
    });
    return {
      id: id(),
      name: e.name,
      muscle: e.muscle,
      unit: 'kg' as const,
      restSeconds: e.restSeconds ?? 90,
      sets,
    };
  });
  const minutes = 44 + Math.floor(random() * 26);
  return {
    id: id(),
    name: session.name,
    startedAt: start.toISOString(),
    finishedAt: new Date(start.getTime() + minutes * 60000).toISOString(),
    notes: '',
    exercises,
    ...(options.membershipId
      ? { membershipId: options.membershipId, programSessionId: session.id }
      : {}),
    ...(options.endedEarly ? { endedEarly: true } : {}),
  };
}

function weights(
  random: () => number,
  weeks: number,
  from: number,
  perWeek: number,
  skipDays: number[],
  now: Date,
) {
  const out: FitnessData['weights'] = [];
  const today = startOfUtcDay(now);
  for (let day = weeks * 7 - 1; day >= 0; day--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - day);
    if (skipDays.includes(date.getUTCDay())) continue;
    const progress = (weeks * 7 - 1 - day) / (weeks * 7);
    const kg = round(
      from + perWeek * weeks * progress + (random() - 0.5) * 0.7,
    );
    out.push({
      date: dayKey(date),
      kg,
      note:
        date.getUTCDay() === 1 && random() < 0.4 ? 'After a big weekend' : '',
    });
  }
  return out;
}

/** Eight weeks of a coached client following their program. */
export function coachedHistory(
  program: Program,
  membershipId: string,
  now = new Date(),
): FitnessData {
  const random = rng(11);
  const today = startOfUtcDay(now);
  const workouts: Workout[] = [];
  const weeks = 8;
  for (let day = weeks * 7 - 1; day >= 1; day--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - day);
    const session = program.sessions.find((s) => s.day === date.getUTCDay());
    if (!session) continue;
    const week = weeks - 1 - Math.floor(day / 7);
    // One missed day and one early finish keep the record honest.
    if (day === 24) continue;
    const start = new Date(
      date.getTime() + 15 * 3600000 + Math.floor(random() * 40) * 60000,
    );
    workouts.push(
      workoutFor(random, session, start, week, {
        membershipId,
        endedEarly: day === 12,
      }),
    );
  }
  const data: FitnessData = {
    ...EMPTY,
    goal: 74,
    weights: weights(random, weeks, 78.6, -0.38, [0, 6], now),
    workouts,
  };
  if (!validateData(data))
    throw new Error('Synthetic coached history is invalid.');
  return data;
}

/** Ten weeks of an independent trainee training from their own plans. */
export function soloHistory(now = new Date()): FitnessData {
  const random = rng(29);
  const today = startOfUtcDay(now);
  const routines: Routine[] = STARTERS.map((r) => ({
    ...r,
    id: `local-form-plan-${r.id}`,
    exercises: r.exercises.map((e) => ({ ...e, restSeconds: 90 })),
  }));
  const workouts: Workout[] = [];
  const weeks = 10;
  let turn = 0;
  for (let day = weeks * 7 - 1; day >= 1; day--) {
    const date = new Date(today);
    date.setUTCDate(date.getUTCDate() - day);
    const weekday = date.getUTCDay();
    if (![1, 3, 5].includes(weekday) && !(weekday === 6 && random() < 0.3))
      continue;
    if (random() < 0.08) continue;
    const week = weeks - 1 - Math.floor(day / 7);
    const routine = routines[turn++ % routines.length];
    const start = new Date(
      date.getTime() + 16 * 3600000 + Math.floor(random() * 90) * 60000,
    );
    workouts.push(workoutFor(random, routine, start, week));
  }
  const data: FitnessData = {
    ...EMPTY,
    goal: 70,
    routines,
    weights: weights(random, weeks, 66.8, 0.17, [0, 2, 4], now),
    workouts,
  };
  if (!validateData(data))
    throw new Error('Synthetic solo history is invalid.');
  return data;
}
