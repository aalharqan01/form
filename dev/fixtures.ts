import { STARTERS, type Routine } from '../lib/fitness.ts';
import type { CoachProfile, Program } from '../lib/coaching.ts';
import type { CoachedOptions } from './synthetic.ts';

// Sample coach, packages, templates, program and clients shared by the local
// launcher seed and the development-site seed. `prefix` keeps the two sets of
// ids apart (local-form-* on a laptop, dev-form-* on the dev site).
export const COACH_NAME = 'That Guy';

export function coachProfile(
  name = COACH_NAME,
  prefix = 'local-form',
): CoachProfile {
  return {
    name,
    bio: 'Strength training with a clear plan and regular feedback.',
    country: 'QA',
    specialties: 'Strength · Consistency',
    listed: true,
    offers: [
      {
        id: `${prefix}-offer`,
        name: 'Strength coaching',
        price: 500,
        currency: 'QAR',
        description: 'Training, nutrition and weekly reviews.',
        responseHours: 24,
        capacity: 8,
      },
    ],
  };
}

export const withRest = (routine: Routine): Routine => ({
  ...routine,
  exercises: routine.exercises.map((e, i) => ({
    ...e,
    restSeconds: i < 2 ? 120 : 90,
  })),
});

export function templates(prefix = 'local-form'): Routine[] {
  return [
    {
      ...STARTERS[0],
      id: `${prefix}-template-upper`,
      name: 'Upper Body Strength',
    },
    {
      ...STARTERS[1],
      id: `${prefix}-template-lower`,
      name: 'Lower Body Strength',
    },
    {
      id: `${prefix}-template-foundation`,
      name: 'Full Body Foundation',
      exercises: [
        { name: 'Goblet squat', muscle: 'Legs', sets: 3, reps: 10 },
        { name: 'Dumbbell bench press', muscle: 'Chest', sets: 3, reps: 10 },
        { name: 'Seated cable row', muscle: 'Back', sets: 3, reps: 12 },
        { name: 'Romanian deadlift', muscle: 'Legs', sets: 3, reps: 10 },
      ],
    },
  ].map(withRest);
}

export function program(prefix = 'local-form', now = new Date()): Program {
  const [upper, lower, full] = templates(prefix);
  return {
    title: 'Strength & Consistency',
    notes: 'Leave two reps in reserve. Move with control.',
    startDate: new Date(now.getTime() - 70 * 86400000)
      .toISOString()
      .slice(0, 10),
    sessions: [
      { ...upper, id: `${prefix}-session-upper`, day: 1 },
      { ...lower, id: `${prefix}-session-lower`, day: 3 },
      { ...full, id: `${prefix}-session-full`, day: 5 },
    ],
  };
}

export const INTAKE = {
  goals: 'Build strength',
  experience: 'Intermediate',
  equipment: 'Gym',
  limitations: '',
  days: 3,
  country: 'QA',
};

export type ExtraClient = {
  slug: string;
  email: string;
  name: string;
  status: 'active' | 'requested';
  history: CoachedOptions | null;
};

/** Clients without a login of their own, to fill the coach's list. */
export const EXTRA_CLIENTS: ExtraClient[] = [
  {
    slug: 'jordan',
    email: 'jordan@form.test',
    name: 'Mohammed Al-Ghamdi',
    status: 'active',
    history: {
      seed: 17,
      weeks: 6,
      goal: 82,
      startKg: 88.2,
      perWeek: -0.45,
      missed: [3, 10, 17],
      early: [],
    },
  },
  {
    slug: 'priya',
    email: 'priya@form.test',
    name: 'Noura Al-Shehri',
    status: 'active',
    history: {
      seed: 23,
      weeks: 10,
      goal: 60,
      startKg: 57.4,
      perWeek: 0.22,
      missed: [],
      early: [5],
    },
  },
  {
    slug: 'omar',
    email: 'omar@form.test',
    name: 'Khalid Al-Dossari',
    status: 'active',
    history: {
      seed: 31,
      weeks: 3,
      goal: 90,
      startKg: 96.1,
      perWeek: -0.3,
      missed: [1, 2, 5, 8],
      early: [],
    },
  },
  {
    slug: 'lina',
    email: 'lina@form.test',
    name: 'Reem Al-Zahrani',
    status: 'requested',
    history: null,
  },
];
