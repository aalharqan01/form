export type LiftSet = {
  id: string;
  kg: string;
  reps: string;
  done: boolean;
  kind?: 'working' | 'warmup';
  load?: string;
};
export type Exercise = {
  restSeconds?: number;
  instructions?: string;
  videoUrl?: string;
  id: string;
  name: string;
  muscle: string;
  unit?: 'kg' | 'lb';
  sets: LiftSet[];
};
export type Workout = {
  /** Set while the active workout's timer is paused. */
  pausedAt?: string;
  /** Seconds spent paused, excluded from the workout duration. */
  pausedSeconds?: number;
  endedEarly?: boolean;
  membershipId?: string;
  programSessionId?: string;
  id: string;
  name: string;
  startedAt: string;
  finishedAt?: string;
  exercises: Exercise[];
  notes: string;
};
export type Routine = {
  id: string;
  name: string;
  exercises: {
    restSeconds?: number;
    name: string;
    muscle: string;
    instructions?: string;
    videoUrl?: string;
    sets: number;
    reps: number;
    unit?: 'kg' | 'lb';
  }[];
};
export type WeighIn = { date: string; kg: number; note: string };
/** Steps walked on one day, logged by hand or read from the phone. */
export type StepEntry = { date: string; count: number };
export type FitnessData = {
  version: 1;
  weights: WeighIn[];
  /** Optional for logs saved before steps existed. */
  steps?: StepEntry[];
  /** The trainee's own daily step goal; a coach's target takes precedence. */
  stepGoal?: number | null;
  workouts: Workout[];
  routines: Routine[];
  active: Workout | null;
  goal: number | null;
  unit: 'kg' | 'lb';
  restSeconds: number;
};
export const EMPTY: FitnessData = {
  version: 1,
  weights: [],
  steps: [],
  stepGoal: null,
  workouts: [],
  routines: [],
  active: null,
  goal: null,
  unit: 'kg',
  restSeconds: 90,
};
export const EXERCISES = [
  ['Bench press', 'Chest', 'Barbell'],
  ['Incline barbell press', 'Chest', 'Barbell'],
  ['Decline bench press', 'Chest', 'Barbell'],
  ['Close-grip bench press', 'Chest', 'Barbell'],
  ['Incline dumbbell press', 'Chest', 'Dumbbell'],
  ['Dumbbell bench press', 'Chest', 'Dumbbell'],
  ['Dumbbell fly', 'Chest', 'Dumbbell'],
  ['Dumbbell pullover', 'Chest', 'Dumbbell'],
  ['Cable fly', 'Chest', 'Cable'],
  ['Low cable fly', 'Chest', 'Cable'],
  ['Push-up', 'Chest', 'Bodyweight'],
  ['Chest dip', 'Chest', 'Bodyweight'],
  ['Chest press machine', 'Chest', 'Machine'],
  ['Pec deck', 'Chest', 'Machine'],
  ['Smith machine bench press', 'Chest', 'Machine'],
  ['Lat pulldown', 'Back', 'Cable'],
  ['Seated cable row', 'Back', 'Cable'],
  ['Straight-arm pulldown', 'Back', 'Cable'],
  ['Single-arm cable row', 'Back', 'Cable'],
  ['Pull-up', 'Back', 'Bodyweight'],
  ['Chin-up', 'Back', 'Bodyweight'],
  ['Inverted row', 'Back', 'Bodyweight'],
  ['Dumbbell row', 'Back', 'Dumbbell'],
  ['Chest-supported dumbbell row', 'Back', 'Dumbbell'],
  ['Bent-over barbell row', 'Back', 'Barbell'],
  ['Pendlay row', 'Back', 'Barbell'],
  ['T-bar row', 'Back', 'Barbell'],
  ['Assisted pull-up', 'Back', 'Machine'],
  ['Machine row', 'Back', 'Machine'],
  ['Back extension', 'Back', 'Machine'],
  ['Barbell squat', 'Legs', 'Barbell'],
  ['Romanian deadlift', 'Legs', 'Barbell'],
  ['Front squat', 'Legs', 'Barbell'],
  ['Barbell hip thrust', 'Legs', 'Barbell'],
  ['Good morning', 'Legs', 'Barbell'],
  ['Leg press', 'Legs', 'Machine'],
  ['Leg extension', 'Legs', 'Machine'],
  ['Seated leg curl', 'Legs', 'Machine'],
  ['Lying leg curl', 'Legs', 'Machine'],
  ['Standing calf raise', 'Legs', 'Machine'],
  ['Seated calf raise', 'Legs', 'Machine'],
  ['Hack squat', 'Legs', 'Machine'],
  ['Hip abduction', 'Legs', 'Machine'],
  ['Hip adduction', 'Legs', 'Machine'],
  ['Smith machine squat', 'Legs', 'Machine'],
  ['Bulgarian split squat', 'Legs', 'Dumbbell'],
  ['Goblet squat', 'Legs', 'Dumbbell'],
  ['Dumbbell lunge', 'Legs', 'Dumbbell'],
  ['Dumbbell Romanian deadlift', 'Legs', 'Dumbbell'],
  ['Step-up', 'Legs', 'Dumbbell'],
  ['Reverse lunge', 'Legs', 'Dumbbell'],
  ['Bodyweight squat', 'Legs', 'Bodyweight'],
  ['Glute bridge', 'Legs', 'Bodyweight'],
  ['Walking lunge', 'Legs', 'Bodyweight'],
  ['Single-leg calf raise', 'Legs', 'Bodyweight'],
  ['Cable glute kickback', 'Legs', 'Cable'],
  ['Shoulder press', 'Shoulders', 'Dumbbell'],
  ['Lateral raise', 'Shoulders', 'Dumbbell'],
  ['Arnold press', 'Shoulders', 'Dumbbell'],
  ['Front raise', 'Shoulders', 'Dumbbell'],
  ['Rear delt fly', 'Shoulders', 'Dumbbell'],
  ['Face pull', 'Shoulders', 'Cable'],
  ['Cable lateral raise', 'Shoulders', 'Cable'],
  ['Cable rear delt fly', 'Shoulders', 'Cable'],
  ['Overhead press', 'Shoulders', 'Barbell'],
  ['Upright row', 'Shoulders', 'Barbell'],
  ['Barbell shrug', 'Shoulders', 'Barbell'],
  ['Shoulder press machine', 'Shoulders', 'Machine'],
  ['Reverse pec deck', 'Shoulders', 'Machine'],
  ['Biceps curl', 'Arms', 'Dumbbell'],
  ['Hammer curl', 'Arms', 'Dumbbell'],
  ['Overhead triceps extension', 'Arms', 'Dumbbell'],
  ['Incline dumbbell curl', 'Arms', 'Dumbbell'],
  ['Concentration curl', 'Arms', 'Dumbbell'],
  ['Triceps kickback', 'Arms', 'Dumbbell'],
  ['Triceps pushdown', 'Arms', 'Cable'],
  ['Cable biceps curl', 'Arms', 'Cable'],
  ['Rope hammer curl', 'Arms', 'Cable'],
  ['Cable overhead triceps extension', 'Arms', 'Cable'],
  ['Barbell curl', 'Arms', 'Barbell'],
  ['EZ-bar curl', 'Arms', 'Barbell'],
  ['Skull crusher', 'Arms', 'Barbell'],
  ['Preacher curl machine', 'Arms', 'Machine'],
  ['Triceps dip', 'Arms', 'Bodyweight'],
  ['Diamond push-up', 'Arms', 'Bodyweight'],
  ['Cable crunch', 'Core', 'Cable'],
  ['Pallof press', 'Core', 'Cable'],
  ['Hanging knee raise', 'Core', 'Bodyweight'],
  ['Crunch', 'Core', 'Bodyweight'],
  ['Reverse crunch', 'Core', 'Bodyweight'],
  ['Hanging leg raise', 'Core', 'Bodyweight'],
  ['Bicycle crunch', 'Core', 'Bodyweight'],
  ['Ab crunch machine', 'Core', 'Machine'],
  ['Deadlift', 'Full body', 'Barbell'],
  ['Sumo deadlift', 'Full body', 'Barbell'],
  ['Kettlebell swing', 'Full body', 'Kettlebell'],
  ['Kettlebell clean', 'Full body', 'Kettlebell'],
  ['Burpee', 'Full body', 'Bodyweight'],
] as const;
export const STARTERS: Routine[] = [
  {
    id: 'upper',
    name: 'Upper body',
    exercises: [
      { name: 'Bench press', muscle: 'Chest', sets: 3, reps: 8 },
      { name: 'Lat pulldown', muscle: 'Back', sets: 3, reps: 10 },
      { name: 'Shoulder press', muscle: 'Shoulders', sets: 3, reps: 10 },
      { name: 'Seated cable row', muscle: 'Back', sets: 3, reps: 10 },
      { name: 'Biceps curl', muscle: 'Arms', sets: 3, reps: 12 },
    ],
  },
  {
    id: 'lower',
    name: 'Lower body',
    exercises: [
      { name: 'Barbell squat', muscle: 'Legs', sets: 3, reps: 8 },
      { name: 'Romanian deadlift', muscle: 'Legs', sets: 3, reps: 10 },
      { name: 'Leg extension', muscle: 'Legs', sets: 3, reps: 12 },
      { name: 'Seated leg curl', muscle: 'Legs', sets: 3, reps: 12 },
      { name: 'Standing calf raise', muscle: 'Legs', sets: 3, reps: 15 },
    ],
  },
];
export const id = () => crypto.randomUUID();
export function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function dateLabel(d: string, long = false) {
  return new Date(d.length === 10 ? d + 'T12:00:00' : d).toLocaleDateString(
    'en-GB',
    { day: 'numeric', month: long ? 'long' : 'short' },
  );
}
export function dayDiff(a: string, b: string) {
  return (
    (Date.parse(a.slice(0, 10) + 'T12:00:00Z') -
      Date.parse(b.slice(0, 10) + 'T12:00:00Z')) /
    86400000
  );
}
export function displayWeight(kg: number, unit: 'kg' | 'lb') {
  return kg * (unit === 'lb' ? 2.2046226218 : 1);
}
export function toKg(value: number, unit: 'kg' | 'lb') {
  return value / (unit === 'lb' ? 2.2046226218 : 1);
}
export function smoothWeights(weights: WeighIn[]) {
  const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
  let trend = sorted[0]?.kg ?? 0;
  return sorted.map((w, i) => {
    const days = i ? dayDiff(w.date, sorted[i - 1].date) : 0;
    if (i) trend += (w.kg - trend) * (1 - Math.exp(-days / 7));
    return { ...w, trend };
  });
}
export function trendStats(weights: WeighIn[], goal: number | null) {
  const points = smoothWeights(weights),
    first = points[0],
    last = points.at(-1);
  if (!first || !last)
    return { points, latest: null, rate: null, remaining: null, progress: 0 };
  const baseline = [...points]
    .reverse()
    .find((p) => dayDiff(last.date, p.date) >= 7);
  const rate = baseline
    ? ((last.trend - baseline.trend) / dayDiff(last.date, baseline.date)) * 7
    : null;
  const denominator = goal === null ? 0 : Math.abs(first.kg - goal);
  return {
    points,
    latest: last,
    rate,
    remaining: goal === null ? null : Math.abs(last.trend - goal),
    progress: denominator
      ? Math.min(
          1,
          Math.max(
            0,
            (first.kg - last.trend) / (first.kg - (goal ?? first.kg)),
          ),
        )
      : goal !== null
        ? Math.abs(last.trend - goal) < 0.1
          ? 1
          : 0
        : 0,
  };
}
export function volume(w: Workout) {
  return w.exercises.reduce(
    (a, e) =>
      a +
      e.sets
        .filter((s) => s.done)
        .reduce((b, s) => b + Number(s.kg) * Number(s.reps), 0),
    0,
  );
}
export function completedSets(w: Workout) {
  return w.exercises.reduce(
    (a, e) => a + e.sets.filter((s) => s.done).length,
    0,
  );
}
export function validDate(d: unknown): d is string {
  return (
    typeof d === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(d) &&
    !isNaN(Date.parse(d)) &&
    new Date(d).toISOString().slice(0, 10) === d
  );
}
const str = (x: unknown, max = 200): x is string =>
  typeof x === 'string' && x.length <= max;
const number = (x: unknown, min: number, max: number): x is number =>
  typeof x === 'number' && Number.isFinite(x) && x >= min && x <= max;
/** Seconds a workout has been paused, including an open pause at `now`. */
export function pausedSeconds(workout: Workout, now = Date.now()) {
  const closed = workout.pausedSeconds ?? 0;
  const open = workout.pausedAt
    ? Math.max(0, (now - Date.parse(workout.pausedAt)) / 1000)
    : 0;
  return closed + open;
}
/** Active seconds between start and `end`, excluding pauses. */
export function workoutSeconds(workout: Workout, end = Date.now()) {
  return Math.max(
    0,
    (end - Date.parse(workout.startedAt)) / 1000 - pausedSeconds(workout, end),
  );
}
export function pauseWorkout(workout: Workout, now = new Date()): Workout {
  return workout.pausedAt
    ? workout
    : { ...workout, pausedAt: now.toISOString() };
}
export function resumeWorkout(workout: Workout, now = new Date()): Workout {
  if (!workout.pausedAt) return workout;
  const { pausedAt: _open, ...rest } = workout;
  return {
    ...rest,
    pausedSeconds: Math.round(pausedSeconds(workout, now.getTime())),
  };
}
/** Steps logged for one calendar day, or null when nothing was logged. */
export function stepsOn(data: Pick<FitnessData, 'steps'>, date: string) {
  return data.steps?.find((e) => e.date === date)?.count ?? null;
}
/** Average daily steps over the last `days` days, counting logged days only. */
export function stepsAverage(
  steps: StepEntry[] | undefined,
  days = 7,
  now = new Date(),
) {
  const end = new Date(now);
  end.setHours(0, 0, 0, 0);
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  const from = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  const to = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`;
  const logged = (steps ?? []).filter((e) => e.date >= from && e.date <= to);
  return {
    days: logged.length,
    average: logged.length
      ? Math.round(logged.reduce((n, e) => n + e.count, 0) / logged.length)
      : null,
  };
}
export function validateData(d: unknown): d is FitnessData {
  if (!d || typeof d !== 'object') return false;
  const v = d as FitnessData;
  const validWorkout = (w: Workout) =>
    w &&
    str(w.id, 100) &&
    (w.endedEarly === undefined || typeof w.endedEarly === 'boolean') &&
    (w.pausedAt === undefined ||
      (str(w.pausedAt, 40) && Number.isFinite(Date.parse(w.pausedAt)))) &&
    (w.pausedSeconds === undefined || number(w.pausedSeconds, 0, 86400 * 7)) &&
    (w.membershipId === undefined || str(w.membershipId, 100)) &&
    (w.programSessionId === undefined || str(w.programSessionId, 100)) &&
    str(w.name, 100) &&
    str(w.startedAt, 40) &&
    Number.isFinite(Date.parse(w.startedAt)) &&
    (!w.finishedAt ||
      (str(w.finishedAt, 40) && Number.isFinite(Date.parse(w.finishedAt)))) &&
    str(w.notes, 2000) &&
    Array.isArray(w.exercises) &&
    w.exercises.length <= 60 &&
    w.exercises.every(
      (e) =>
        e &&
        str(e.id, 100) &&
        str(e.name, 100) &&
        e.name.trim().length > 0 &&
        str(e.muscle, 50) &&
        (e.instructions === undefined || str(e.instructions, 1000)) &&
        (e.videoUrl === undefined || str(e.videoUrl, 1000)) &&
        (e.unit === undefined || e.unit === 'kg' || e.unit === 'lb') &&
        (e.restSeconds === undefined ||
          (Number.isInteger(e.restSeconds) && number(e.restSeconds, 0, 600))) &&
        Array.isArray(e.sets) &&
        e.sets.length <= 50 &&
        e.sets.every(
          (s) =>
            s &&
            str(s.id, 100) &&
            str(s.kg, 20) &&
            str(s.reps, 20) &&
            (s.load === undefined || str(s.load, 20)) &&
            typeof s.done === 'boolean' &&
            (s.kind === undefined ||
              s.kind === 'working' ||
              s.kind === 'warmup') &&
            (!s.done ||
              (s.kg !== '' &&
                number(Number(s.kg), 0, 1500) &&
                number(Number(s.reps), 1, 1000) &&
                Number.isInteger(Number(s.reps)))),
        ),
    );
  return (
    v.version === 1 &&
    ['kg', 'lb'].includes(v.unit) &&
    number(v.restSeconds, 0, 600) &&
    (v.goal === null || number(v.goal, 20, 500)) &&
    Array.isArray(v.weights) &&
    v.weights.length <= 20000 &&
    v.weights.every(
      (w) =>
        w && validDate(w.date) && number(w.kg, 20, 500) && str(w.note, 500),
    ) &&
    new Set(v.weights.map((w) => w.date)).size === v.weights.length &&
    (v.steps === undefined ||
      (Array.isArray(v.steps) &&
        v.steps.length <= 20000 &&
        v.steps.every(
          (e) =>
            e &&
            validDate(e.date) &&
            Number.isInteger(e.count) &&
            e.count >= 0 &&
            e.count <= 200000,
        ) &&
        new Set(v.steps.map((e) => e.date)).size === v.steps.length)) &&
    (v.stepGoal === undefined ||
      v.stepGoal === null ||
      (Number.isInteger(v.stepGoal) &&
        v.stepGoal >= 500 &&
        v.stepGoal <= 100000)) &&
    Array.isArray(v.workouts) &&
    v.workouts.length <= 10000 &&
    v.workouts.every(validWorkout) &&
    (v.active === null || validWorkout(v.active)) &&
    Array.isArray(v.routines) &&
    v.routines.length <= 100 &&
    v.routines.every(
      (r) =>
        r &&
        str(r.id, 100) &&
        str(r.name, 100) &&
        r.name.trim().length > 0 &&
        Array.isArray(r.exercises) &&
        r.exercises.length <= 60 &&
        r.exercises.every(
          (e) =>
            e &&
            str(e.name, 100) &&
            e.name.trim().length > 0 &&
            str(e.muscle, 50) &&
            (e.instructions === undefined || str(e.instructions, 1000)) &&
            (e.videoUrl === undefined || str(e.videoUrl, 1000)) &&
            (e.unit === undefined || e.unit === 'kg' || e.unit === 'lb') &&
            (e.restSeconds === undefined ||
              (Number.isInteger(e.restSeconds) &&
                number(e.restSeconds, 0, 600))) &&
            number(e.sets, 1, 50) &&
            Number.isInteger(e.sets) &&
            number(e.reps, 1, 1000) &&
            Number.isInteger(e.reps),
        ),
    )
  );
}

export function lastPerformance(workouts: Workout[], name: string) {
  return [...workouts]
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .flatMap((w) => w.exercises)
    .find((e) => e.name === name)
    ?.sets.filter((s) => s.done && s.kind !== 'warmup');
}
export function exerciseHistory(workouts: Workout[], name: string) {
  let bestLoad = 0,
    bestVolume = 0;
  return [...workouts]
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .flatMap((w) => {
      const sets = w.exercises
        .filter((e) => e.name === name)
        .flatMap((e) => e.sets)
        .filter((s) => s.done && s.kind !== 'warmup');
      if (!sets.length) return [];
      const maxKg = Math.max(...sets.map((s) => Number(s.kg))),
        reps = Math.max(
          ...sets
            .filter((s) => Number(s.kg) === maxKg)
            .map((s) => Number(s.reps)),
        ),
        total = sets.reduce((a, s) => a + Number(s.kg) * Number(s.reps), 0);
      const record = bestLoad > 0 && maxKg > bestLoad,
        volumeRecord = bestVolume > 0 && total > bestVolume;
      bestLoad = Math.max(bestLoad, maxKg);
      bestVolume = Math.max(bestVolume, total);
      return [
        {
          id: w.id,
          date: w.startedAt,
          kg: maxKg,
          reps,
          volume: total,
          sets: sets.length,
          record,
          volumeRecord,
        },
      ];
    });
}
export function weightInsights(
  weights: WeighIn[],
  goal: number | null,
  asOf = today(),
) {
  const s = trendStats(weights, goal),
    last = s.latest;
  const recent = s.points.filter(
    (p) => dayDiff(asOf, p.date) >= 0 && dayDiff(asOf, p.date) < 7,
  );
  const average = recent.length
    ? recent.reduce((a, p) => a + p.kg, 0) / recent.length
    : null;
  const window = s.points.filter(
    (p) => last && dayDiff(last.date, p.date) <= 28,
  );
  let estimate: string | null = null,
    reason = 'Add at least 8 weigh-ins over 14 days.';
  if (goal === null) reason = 'Set a goal to see an estimate.';
  else if (last && s.progress >= 1) reason = 'Goal reached.';
  else if (last && dayDiff(asOf, last.date) > 7)
    reason = 'Log a recent weigh-in to update the estimate.';
  else if (
    last &&
    window.length >= 8 &&
    dayDiff(last.date, window[0].date) >= 14
  ) {
    const xs = window.map((p) => dayDiff(p.date, window[0].date)),
      ys = window.map((p) => p.trend),
      mx = xs.reduce((a, b) => a + b) / xs.length,
      my = ys.reduce((a, b) => a + b) / ys.length;
    const slope =
      xs.reduce((a, x, i) => a + (x - mx) * (ys[i] - my), 0) /
      xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    const residual = ys.reduce(
        (a, y, i) => a + (y - (my + slope * (xs[i] - mx))) ** 2,
        0,
      ),
      variance = ys.reduce((a, y) => a + (y - my) ** 2, 0),
      r2 = variance > 0 ? 1 - residual / variance : 0;
    const days = goal === null ? 0 : (goal - last.trend) / slope;
    reason =
      days <= 0
        ? 'Your recent trend is moving away from your goal.'
        : Math.abs(slope) < 0.005
          ? 'Your recent trend is fairly stable.'
          : r2 < 0.55
            ? 'Your trend is still too variable for an estimate.'
            : days > 730
              ? 'Your goal is too far away for a useful estimate.'
              : 'Based on your recent trend; not a deadline.';
    if (days > 0 && days <= 730 && Math.abs(slope) >= 0.005 && r2 >= 0.55) {
      const d = new Date(last.date + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() + Math.ceil(days));
      estimate = d.toISOString().slice(0, 10);
    }
  }
  const first = s.points[0],
    milestones =
      first && goal !== null
        ? [0.25, 0.5, 0.75, 1].map((f) => ({
            fraction: f,
            kg: first.kg + (goal - first.kg) * f,
            reached: s.progress >= f,
          }))
        : [];
  return { average, count: recent.length, estimate, reason, milestones };
}
