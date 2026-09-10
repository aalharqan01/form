import type { Routine, FitnessData, WeighIn } from './fitness';
export type Offer = {
  id: string;
  name: string;
  price: number;
  currency: 'QAR' | 'SAR';
  description: string;
  responseHours: number;
};
export type CoachProfile = {
  listed?: boolean;
  name: string;
  bio: string;
  country: 'QA' | 'SA';
  specialties: string;
  offers: Offer[];
};
export type Intake = {
  goals: string;
  experience: string;
  equipment: string;
  limitations: string;
  days: number;
  country: 'QA' | 'SA';
};
export type Program = {
  title: string;
  notes: string;
  startDate: string;
  sessions: (Routine & { day: number })[];
};
export type WorkoutTemplate = {
  id: string;
  routine: Routine;
  revision: number;
  updatedAt: string;
};

// Uploaded demonstrations belong to a specific membership. They must be attached
// for each client until a separately authorized shared video library exists.
export function templateRoutine(session: Routine): Routine {
  return {
    id: session.id,
    name: session.name,
    exercises: session.exercises.map((exercise) => ({
      ...exercise,
      videoUrl: exercise.videoUrl?.startsWith('/api/videos')
        ? ''
        : exercise.videoUrl,
    })),
  };
}

export function isTemplateRoutine(value: unknown): value is Routine {
  if (!value || typeof value !== 'object') return false;
  const routine = value as Routine;
  if (
    !Array.isArray(routine.exercises) ||
    routine.exercises.some(
      (exercise) => !exercise || typeof exercise !== 'object',
    )
  )
    return false;
  return (
    isProgram({
      title: 'Template',
      notes: '',
      startDate: '2026-01-01',
      sessions: [{ ...routine, day: 0 }],
    }) &&
    routine.exercises.every(
      (exercise) => !exercise.videoUrl?.startsWith('/api/videos'),
    )
  );
}

export function sessionFromTemplate(
  routine: Routine,
  sessionId: string,
  day = 1,
): Program['sessions'][number] {
  return { ...templateRoutine(routine), id: sessionId, day };
}
export type NutritionTargets = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  notes: string;
};
export function isNutrition(v: unknown): v is NutritionTargets {
  const n = v as NutritionTargets;
  return (
    !!n &&
    Number.isInteger(n.calories) &&
    n.calories >= 1 &&
    n.calories <= 10000 &&
    [n.protein, n.carbs, n.fat].every(
      (x) => Number.isFinite(x) && x >= 0 && x <= 1500,
    ) &&
    text(n.notes, 2000, false)
  );
}
export type Member = {
  nutrition?: NutritionTargets | null;
  id: string;
  coach_id: string;
  trainee_id: string | null;
  email: string;
  name: string;
  status:
    | 'invited'
    | 'requested'
    | 'awaiting_payment'
    | 'rejected'
    | 'withdrawn'
    | 'active'
    | 'ended';
  decided_at: string | null;
  decision_note: string;
  expires_at: string;
  offer: Offer;
  intake: Intake;
  program: Program | null;
  revision: number;
  created_at: string;
  accepted_at: string | null;
  ended_at: string | null;
  coachName: string;
  unread: number;
  pending: number;
  stats?: {
    workouts: number;
    lastWorkout: string | null;
    averageKg: number | null;
    weightCount: number;
    weightWeek: string;
    previousAverageKg: number | null;
    averageChangeKg: number | null;
    due: number;
    completed: number;
  };
};
export type Checkin = {
  id: string;
  week: string;
  answers: { energy: number; sleep: number; wins: string; challenges: string };
  feedback: string;
  created_at: string;
  reviewed_at: string | null;
};
export type Message = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};
export type CoachingState = {
  userId: string;
  profile: CoachProfile | null;
  profileRevision: number;
  clients: Member[];
  memberships: Member[];
  billing: { enabled: false; message: string };
};
export type MemberDetail = {
  member: Member;
  messages: Message[];
  checkins: Checkin[];
  fitness: FitnessData | null;
};
export function text(
  value: unknown,
  max: number,
  required = true,
): value is string {
  return (
    typeof value === 'string' &&
    value.length <= max &&
    (!required || value.trim().length > 0)
  );
}
export function isOffer(v: unknown): v is Offer {
  const o = v as Offer;
  return (
    !!o &&
    text(o.id, 100) &&
    text(o.name, 100) &&
    text(o.description, 2000) &&
    ['QAR', 'SAR'].includes(o.currency) &&
    Number.isInteger(o.price) &&
    o.price >= 0 &&
    o.price <= 100000 &&
    Number.isInteger(o.responseHours) &&
    o.responseHours >= 1 &&
    o.responseHours <= 168
  );
}
export function isProfile(v: unknown): v is CoachProfile {
  const p = v as CoachProfile;
  return (
    !!p &&
    (p.listed === undefined || typeof p.listed === 'boolean') &&
    (!p.listed ||
      (Array.isArray(p.offers) &&
        p.offers.length > 0 &&
        p.offers.every((o) => o.price > 0))) &&
    text(p.name, 100) &&
    text(p.bio, 2000, false) &&
    text(p.specialties, 300, false) &&
    ['QA', 'SA'].includes(p.country) &&
    Array.isArray(p.offers) &&
    p.offers.length <= 10 &&
    p.offers.every(isOffer) &&
    new Set(p.offers.map((o) => o.id)).size === p.offers.length
  );
}
export function isIntake(v: unknown): v is Intake {
  const i = v as Intake;
  return (
    !!i &&
    text(i.goals, 2000) &&
    text(i.experience, 500) &&
    text(i.equipment, 500) &&
    text(i.limitations, 2000, false) &&
    Number.isInteger(i.days) &&
    i.days >= 1 &&
    i.days <= 7 &&
    ['QA', 'SA'].includes(i.country)
  );
}
export function videoURL(v: unknown) {
  if (v === '' || v === undefined) return true;
  if (typeof v !== 'string' || v.length > 1000) return false;
  if (/^\/api\/videos\?id=[a-f0-9-]{36}$/.test(v)) return true;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && !u.username && !u.password;
  } catch {
    return false;
  }
}
export function isProgram(v: unknown): v is Program {
  const p = v as Program;
  return (
    !!p &&
    text(p.title, 100) &&
    text(p.notes, 2000, false) &&
    /^\d{4}-\d{2}-\d{2}$/.test(p.startDate) &&
    Number.isFinite(Date.parse(p.startDate)) &&
    new Date(p.startDate).toISOString().slice(0, 10) === p.startDate &&
    Array.isArray(p.sessions) &&
    p.sessions.length > 0 &&
    p.sessions.length <= 14 &&
    new Set(p.sessions.map((s) => s.id)).size === p.sessions.length &&
    p.sessions.every(
      (s) =>
        text(s.id, 100) &&
        text(s.name, 100) &&
        Number.isInteger(s.day) &&
        s.day >= 0 &&
        s.day <= 6 &&
        Array.isArray(s.exercises) &&
        s.exercises.length > 0 &&
        s.exercises.length <= 30 &&
        s.exercises.every(
          (e) =>
            text(e.name, 100) &&
            text(e.muscle, 50, false) &&
            Number.isInteger(e.sets) &&
            e.sets >= 1 &&
            e.sets <= 20 &&
            Number.isInteger(e.reps) &&
            e.reps >= 1 &&
            e.reps <= 100 &&
            ['kg', 'lb'].includes(e.unit ?? 'kg') &&
            (e.instructions === undefined ||
              text(e.instructions, 1000, false)) &&
            videoURL(e.videoUrl),
        ),
    )
  );
}
export function memberStats(
  fitness: FitnessData | null,
  member: Pick<Member, 'id' | 'program'>,
  now = new Date(),
) {
  const workouts = fitness?.workouts ?? [],
    since = now.getTime() - 7 * 86400000;
  const recent = workouts.filter((w) => Date.parse(w.startedAt) >= since);
  const readings = [...(fitness?.weights ?? [])].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const weightWeek = weekOf(now);
  const weeks = weeklyWeights(readings, now);
  const current = weeks.find((w) => w.week === weightWeek);
  let due = 0,
    completed = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i);
    const day = d.toISOString().slice(0, 10);
    if (member.program && day >= member.program.startDate)
      for (const s of member.program.sessions.filter(
        (s) => s.day === d.getUTCDay(),
      )) {
        due++;
        if (
          workouts.some(
            (w) =>
              w.membershipId === member.id &&
              w.programSessionId === s.id &&
              w.startedAt.slice(0, 10) === day,
          )
        )
          completed++;
      }
  }
  return {
    workouts: recent.length,
    lastWorkout:
      workouts
        .map((w) => w.startedAt)
        .sort()
        .at(-1) ?? null,
    averageKg: current?.averageKg ?? null,
    weightCount: current?.count ?? 0,
    weightWeek,
    previousAverageKg: current?.previousAverageKg ?? null,
    averageChangeKg: current?.changeKg ?? null,
    due,
    completed,
  };
}
export function weekOf(date = new Date()) {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}
export const DAYS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export type MarketplaceCoach = CoachProfile & {
  coachId: string;
  revision: number;
};
export const memberStatus = (s: Member['status']) =>
  ({
    invited: 'Invitation retired',
    requested: 'Awaiting coach review',
    awaiting_payment: 'Accepted · payment required',
    rejected: 'Declined',
    withdrawn: 'Withdrawn',
    active: 'Active',
    ended: 'Ended',
  })[s];

export function weeklyWeights(readings: WeighIn[], now = new Date()) {
  const groups = new Map<string, WeighIn[]>();
  for (const w of [...readings].sort((a, b) => a.date.localeCompare(b.date))) {
    if (w.date > now.toISOString().slice(0, 10)) continue;
    const week = weekOf(new Date(w.date + 'T00:00:00Z'));
    groups.set(week, [...(groups.get(week) ?? []), w]);
  }
  const means = new Map(
    [...groups].map(([week, entries]) => [
      week,
      entries.reduce((sum, w) => sum + w.kg, 0) / entries.length,
    ]),
  );
  return [...groups]
    .map(([week, entries]) => {
      const previous = new Date(week + 'T00:00:00Z');
      previous.setUTCDate(previous.getUTCDate() - 7);
      const previousAverageKg =
        means.get(previous.toISOString().slice(0, 10)) ?? null;
      const averageKg = means.get(week)!;
      return {
        week,
        count: entries.length,
        averageKg,
        previousAverageKg,
        changeKg:
          previousAverageKg === null ? null : averageKg - previousAverageKg,
        withinWeekKg:
          entries.length > 1 ? entries.at(-1)!.kg - entries[0].kg : null,
      };
    })
    .reverse();
}
