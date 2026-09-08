import type { Routine, FitnessData } from './fitness';
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
export type Member = {
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
  const weekReadings = readings.filter(
    (w) => w.date >= weightWeek && w.date <= now.toISOString().slice(0, 10),
  );
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
    averageKg: weekReadings.length
      ? weekReadings.reduce((sum, w) => sum + w.kg, 0) / weekReadings.length
      : null,
    weightCount: weekReadings.length,
    weightWeek,
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
