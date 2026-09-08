import {
  EMPTY,
  type FitnessData,
  type Routine,
  type Workout,
  toKg,
  lastPerformance,
} from './fitness';
import {
  type CoachProfile,
  type Member,
  type Checkin,
  type Message,
  type Program,
  type Intake,
  isIntake,
  isProgram,
  isProfile,
  memberStats,
  weekOf,
} from './coaching';
export type Simulation = {
  profile: CoachProfile;
  profileRevision: number;
  member: Member | null;
  fitness: FitnessData;
  messages: Message[];
  checkins: Checkin[];
  historyAdded: boolean;
};
export const SIM_COACH = 'demo-coach',
  SIM_CLIENT = 'demo-trainee';
const uid = () => crypto.randomUUID();
export function initialSimulation(): Simulation {
  return {
    profile: {
      name: 'Sam — Strength Coach',
      bio: 'Personalised strength training with weekly reviews and clear, practical feedback.',
      specialties: 'Strength · Consistency · Body composition',
      country: 'QA',
      listed: true,
      offers: [
        {
          id: 'demo-package',
          name: 'Personal coaching',
          price: 500,
          currency: 'QAR',
          description:
            'A personalised training program, weekly check-ins, progress reviews and messaging.',
          responseHours: 24,
        },
      ],
    },
    profileRevision: 0,
    member: null,
    fitness: structuredClone(EMPTY),
    messages: [],
    checkins: [],
    historyAdded: false,
  };
}
export function exampleProgram(): Program {
  const d = new Date();
  d.setDate(d.getDate() - 28);
  return {
    title: 'Four-week strength foundation',
    notes:
      'Keep two reps in reserve. Add load only when every working set feels controlled.',
    startDate: d.toISOString().slice(0, 10),
    sessions: [
      {
        id: 'demo-upper',
        name: 'Upper body',
        day: 1,
        exercises: [
          {
            name: 'Bench press',
            muscle: 'Chest',
            sets: 3,
            reps: 8,
            unit: 'kg',
            instructions: 'Lower for two seconds. Keep your feet planted.',
          },
          {
            name: 'Seated cable row',
            muscle: 'Back',
            sets: 3,
            reps: 10,
            unit: 'lb',
            instructions:
              'Pause with the handle at your ribs. Avoid leaning back.',
          },
        ],
      },
      {
        id: 'demo-lower',
        name: 'Lower body',
        day: 3,
        exercises: [
          {
            name: 'Barbell squat',
            muscle: 'Legs',
            sets: 3,
            reps: 8,
            unit: 'kg',
            instructions: 'Use a controlled range of motion.',
          },
          {
            name: 'Romanian deadlift',
            muscle: 'Legs',
            sets: 3,
            reps: 10,
            unit: 'kg',
            instructions: 'Keep the weight close to your legs.',
          },
        ],
      },
      {
        id: 'demo-repeat',
        name: 'Upper body — second session',
        day: 5,
        exercises: [
          {
            name: 'Bench press',
            muscle: 'Chest',
            sets: 3,
            reps: 8,
            unit: 'kg',
          },
          {
            name: 'Seated cable row',
            muscle: 'Back',
            sets: 3,
            reps: 10,
            unit: 'lb',
          },
        ],
      },
    ],
  };
}
export function startSimulationWorkout(s: Simulation, r: Routine) {
  if (s.fitness.active) return;
  if (s.member?.status !== 'active')
    throw new Error('Complete the simulated payment first.');
  s.fitness.active = {
    id: uid(),
    name: r.name,
    membershipId: s.member.id,
    programSessionId: r.id,
    startedAt: new Date().toISOString(),
    notes: '',
    exercises: r.exercises.map((e) => ({
      id: uid(),
      name: e.name,
      muscle: e.muscle,
      unit: e.unit,
      instructions: e.instructions,
      videoUrl: e.videoUrl,
      sets: Array.from({ length: e.sets }, (_, i) => ({
        id: uid(),
        kg: lastPerformance(s.fitness.workouts, e.name)?.[i]?.kg ?? '',
        reps: String(e.reps),
        done: false,
        kind: 'working' as const,
      })),
    })),
  };
}
export function simulatePayment(s: Simulation) {
  if (s.member?.status !== 'awaiting_payment')
    throw new Error('The coach must accept first.');
  s.member.status = 'active';
  s.member.accepted_at = new Date().toISOString();
  s.member.revision++;
}
export function addSimulationHistory(s: Simulation) {
  if (s.member?.status !== 'active' || !s.member.program)
    throw new Error('Assign a program first.');
  if (s.historyAdded) return;
  const end = new Date(),
    workouts: Workout[] = [];
  for (let i = 0; i < 28; i++) {
    const d = new Date(end);
    d.setDate(d.getDate() - 27 + i);
    d.setHours(12, 0, 0, 0);
    const date = d.toISOString().slice(0, 10),
      week = Math.floor(i / 7);
    if (!s.fitness.weights.some((w) => w.date === date))
      s.fitness.weights.push({
        date,
        kg: Math.round((82 - i * 0.06 + Math.sin(i * 1.7) * 0.3) * 10) / 10,
        note: 'Simulated daily weigh-in',
      });
    for (const session of s.member.program.sessions.filter(
      (r) => r.day === d.getUTCDay(),
    ))
      workouts.push({
        id: uid(),
        name: session.name,
        membershipId: s.member.id,
        programSessionId: session.id,
        startedAt: d.toISOString(),
        finishedAt: new Date(d.getTime() + 45 * 60000).toISOString(),
        notes: 'Simulated training session',
        exercises: session.exercises.map((e, j) => ({
          id: uid(),
          name: e.name,
          muscle: e.muscle,
          unit: e.unit,
          sets: Array.from({ length: e.sets }, () => ({
            id: uid(),
            kg: String(
              toKg(
                (e.unit === 'lb' ? 80 : 40 + j * 10) +
                  week * (e.unit === 'lb' ? 5 : 2.5),
                e.unit ?? 'kg',
              ),
            ),
            reps: String(e.reps),
            kind: 'working',
            done: true,
          })),
        })),
      });
  }
  s.fitness.workouts = [...workouts, ...s.fitness.workouts];
  s.fitness.weights.sort((a, b) => a.date.localeCompare(b.date));
  s.fitness.goal = 78;
  s.historyAdded = true;
}
export function simulationRequest(
  s: Simulation,
  role: 'coach' | 'trainee',
  query = '',
  body?: unknown,
): unknown {
  const viewer = role === 'coach' ? SIM_COACH : SIM_CLIENT,
    m = s.member,
    url = new URL('https://simulation.invalid/' + query);
  const detail = () => {
    if (!m) throw new Error('Send a package request first.');
    const copy = structuredClone(m);
    copy.coachName = s.profile.name;
    copy.pending = s.checkins.filter((c) => !c.reviewed_at).length;
    copy.unread = s.messages.filter((v) => v.sender_id !== viewer).length;
    if (m.status === 'active') copy.stats = memberStats(s.fitness, m);
    else copy.program = null;
    return {
      member: copy,
      fitness: m.status === 'active' ? structuredClone(s.fitness) : null,
      messages: m.status === 'active' ? structuredClone(s.messages) : [],
      checkins: m.status === 'active' ? structuredClone(s.checkins) : [],
    };
  };
  if (!body) {
    if (url.searchParams.has('marketplace'))
      return {
        coaches: s.profile.listed
          ? [{ ...s.profile, coachId: SIM_COACH, revision: s.profileRevision }]
          : [],
      };
    if (url.searchParams.has('member')) return detail();
    if (url.searchParams.has('notifications'))
      return {
        reviews: role === 'coach' && m?.status === 'requested' ? 1 : 0,
        payments:
          role === 'trainee' && m?.status === 'awaiting_payment' ? 1 : 0,
      };
    return {
      userId: viewer,
      profile: role === 'coach' ? structuredClone(s.profile) : null,
      profileRevision: s.profileRevision,
      clients: role === 'coach' && m ? [detail().member] : [],
      memberships: role === 'trainee' && m ? [detail().member] : [],
      billing: { enabled: false, message: 'Simulation only' },
    };
  }
  const b = body as Record<string, unknown>;
  if (b.action === 'profile') {
    if (role !== 'coach' || !isProfile(b.profile))
      throw new Error('Check your profile.');
    s.profile = structuredClone(b.profile);
    s.profileRevision++;
    return { ok: true };
  }
  if (b.action === 'request') {
    if (role !== 'trainee' || !isIntake(b.intake) || b.consent !== true)
      throw new Error('Complete the intake and consent.');
    if (m && ['requested', 'awaiting_payment', 'active'].includes(m.status))
      throw new Error('You already have an open request.');
    const offer = s.profile.offers.find((o) => o.id === b.offerId);
    if (!offer) throw new Error('Choose a package.');
    s.member = {
      id: 'demo-membership',
      coach_id: SIM_COACH,
      trainee_id: SIM_CLIENT,
      name: String(b.name),
      email: 'trainee@simulation.invalid',
      status: 'requested',
      expires_at: '',
      offer: structuredClone(offer),
      intake: structuredClone(b.intake as Intake),
      program: null,
      revision: 0,
      created_at: new Date().toISOString(),
      accepted_at: null,
      ended_at: null,
      decided_at: null,
      decision_note: '',
      coachName: s.profile.name,
      unread: 0,
      pending: 0,
    };
    return { id: s.member.id };
  }
  if (!m) throw new Error('Request a package first.');
  if (b.action === 'decision') {
    if (role !== 'coach' || m.status !== 'requested')
      throw new Error('Only the coach can decide a pending request.');
    m.status = b.decision === 'accept' ? 'awaiting_payment' : 'rejected';
    m.decision_note = typeof b.note === 'string' ? b.note : '';
    m.decided_at = new Date().toISOString();
    m.revision++;
    return { ok: true };
  }
  if (b.action === 'withdraw') {
    if (
      role !== 'trainee' ||
      !['requested', 'awaiting_payment'].includes(m.status)
    )
      throw new Error('This request cannot be withdrawn.');
    m.status = 'withdrawn';
    return { ok: true };
  }
  if (m.status !== 'active')
    throw new Error('Complete the simulated payment first.');
  if (b.action === 'program') {
    if (role !== 'coach' || !isProgram(b.program))
      throw new Error('Check the program.');
    m.program = structuredClone(b.program);
    m.revision++;
    return { ok: true };
  }
  if (b.action === 'message') {
    if (typeof b.body !== 'string' || !b.body.trim())
      throw new Error('Write a message.');
    if (!s.messages.some((v) => v.id === b.id))
      s.messages.push({
        id: String(b.id),
        body: String(b.body),
        sender_id: viewer,
        created_at: new Date().toISOString(),
      });
    return { ok: true };
  }
  if (b.action === 'checkin') {
    if (role !== 'trainee') throw new Error('Switch to trainee.');
    if (!s.checkins.some((c) => c.week === weekOf()))
      s.checkins.push({
        id: uid(),
        week: weekOf(),
        answers: structuredClone(b.answers as Checkin['answers']),
        feedback: '',
        created_at: new Date().toISOString(),
        reviewed_at: null,
      });
    return { ok: true };
  }
  if (b.action === 'feedback') {
    if (role !== 'coach') throw new Error('Switch to coach.');
    const c = s.checkins.find((c) => c.id === b.checkinId);
    if (!c) throw new Error('Check-in not found.');
    c.feedback = String(b.feedback);
    c.reviewed_at = new Date().toISOString();
    return { ok: true };
  }
  if (b.action === 'read') return { ok: true };
  if (b.action === 'end') {
    m.status = 'ended';
    m.ended_at = new Date().toISOString();
    return { ok: true };
  }
  throw new Error('This action is unavailable in the simulation.');
}

export function createSimulationStore() {
  let snapshot = initialSimulation();
  const listeners = new Set<() => void>();
  const change = (fn: (s: Simulation) => void) => {
    const next = structuredClone(snapshot);
    fn(next);
    snapshot = next;
    listeners.forEach((fn) => fn());
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (fn: () => void) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    change,
    request: (role: 'coach' | 'trainee', query = '', body?: unknown) => {
      if (!body) return simulationRequest(snapshot, role, query);
      let result: unknown;
      change((s) => {
        result = simulationRequest(s, role, query, body);
      });
      return result;
    },
    reset: () => {
      snapshot = initialSimulation();
      listeners.forEach((fn) => fn());
    },
  };
}
