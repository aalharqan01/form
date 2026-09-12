import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { EMPTY, STARTERS } from '../lib/fitness.ts';
import { identities } from '../dev/roles.ts';
import { coachedHistory, soloHistory } from '../dev/synthetic.ts';

// No remote option by design. Seed only reserved local-form-* fixture records.
// Sample history is filled in only where a fixture log is still empty, so
// progress you logged yourself survives every launch. `--refresh` rewrites the
// two trainee logs and the coached program from the generator.
const refresh = process.argv.includes('--refresh');
const now = new Date().toISOString();
const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
const json = (value) => quote(JSON.stringify(value));
const profile = {
  name: identities.coach.name,
  bio: 'Strength training with a clear plan and regular feedback.',
  country: 'QA',
  specialties: 'Strength · Consistency',
  listed: true,
  offers: [
    {
      id: 'local-form-offer',
      name: 'Strength coaching',
      price: 500,
      currency: 'QAR',
      description: 'Training, nutrition and weekly reviews.',
      responseHours: 24,
      capacity: 8,
    },
  ],
};
// Extra coached clients so the client list and package places have something
// to show. They have no login of their own; Alex's proxy is the client view.
const extraClients = [
  {
    id: 'local-form-client-jordan',
    email: 'jordan@form.test',
    name: 'Jordan Reyes',
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
    id: 'local-form-client-priya',
    email: 'priya@form.test',
    name: 'Priya Nair',
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
    id: 'local-form-client-omar',
    email: 'omar@form.test',
    name: 'Omar Haddad',
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
    id: 'local-form-client-lina',
    email: 'lina@form.test',
    name: 'Lina Karam',
    status: 'requested',
    history: null,
  },
];
const templates = [
  {
    ...STARTERS[0],
    id: 'local-form-template-upper',
    name: 'Upper Body Strength',
  },
  {
    ...STARTERS[1],
    id: 'local-form-template-lower',
    name: 'Lower Body Strength',
  },
  {
    id: 'local-form-template-foundation',
    name: 'Full Body Foundation',
    exercises: [
      { name: 'Goblet squat', muscle: 'Legs', sets: 3, reps: 10 },
      { name: 'Dumbbell bench press', muscle: 'Chest', sets: 3, reps: 10 },
      { name: 'Seated cable row', muscle: 'Back', sets: 3, reps: 12 },
      { name: 'Romanian deadlift', muscle: 'Legs', sets: 3, reps: 10 },
    ],
  },
];
const withRest = (routine) => ({
  ...routine,
  exercises: routine.exercises.map((e, i) => ({
    ...e,
    restSeconds: i < 2 ? 120 : 90,
  })),
});
const program = {
  title: 'Strength & Consistency',
  notes: 'Leave two reps in reserve. Move with control.',
  startDate: new Date(Date.now() - 70 * 86400000).toISOString().slice(0, 10),
  sessions: [
    { ...withRest(templates[0]), id: 'local-form-session-upper', day: 1 },
    { ...withRest(templates[1]), id: 'local-form-session-lower', day: 3 },
    { ...withRest(templates[2]), id: 'local-form-session-full', day: 5 },
  ],
};
const coached = coachedHistory(program, 'local-form-membership');
const solo = soloHistory();
const emptyLog =
  "json_array_length(json_extract(data,'$.workouts'))=0 AND json_array_length(json_extract(data,'$.weights'))=0";
const fill = (id, data) =>
  `UPDATE fitness_accounts SET data=${json(data)}, revision=revision+1, updated_at=${quote(now)} WHERE user_id=${quote(id)}${refresh ? '' : ` AND ${emptyLog}`};`;
const sql = `
INSERT OR IGNORE INTO coach_profiles (user_id,profile,revision,updated_at)
VALUES (${quote(identities.coach.id)},${json(profile)},0,${quote(now)});
INSERT OR IGNORE INTO fitness_accounts (user_id,data,revision,updated_at)
VALUES (${quote(identities.client.id)},${json(EMPTY)},0,${quote(now)});
INSERT OR IGNORE INTO fitness_accounts (user_id,data,revision,updated_at)
VALUES (${quote(identities.solo.id)},${json(EMPTY)},0,${quote(now)});
INSERT OR IGNORE INTO coaching_memberships
(id,coach_id,trainee_id,email,name,status,token_hash,expires_at,offer,intake,program,nutrition,revision,created_at,accepted_at,open_key)
VALUES ('local-form-membership',${quote(identities.coach.id)},${quote(identities.client.id)},
${quote(identities.client.email)},${quote(identities.client.name)},'active','local-form-fixture-not-an-invitation',
'2099-01-01T00:00:00.000Z',${json(profile.offers[0])},
${json({ goals: 'Build strength', experience: 'Beginner', equipment: 'Gym', limitations: '', days: 3, country: 'QA' })},
'null','null',0,${quote(now)},${quote(now)},'local-form-coach:local-form-client');
${templates.map((routine) => `INSERT OR IGNORE INTO coach_workout_templates (id,coach_id,routine,revision,updated_at) VALUES (${quote(routine.id)},${quote(identities.coach.id)},${json(withRest(routine))},1,${quote(now)});`).join('\n')}
${refresh ? `UPDATE coach_profiles SET profile=${json(profile)}, revision=revision+1, updated_at=${quote(now)} WHERE user_id=${quote(identities.coach.id)};` : ''}
UPDATE coaching_memberships SET program=${json(program)}, revision=revision+1 WHERE id='local-form-membership'${refresh ? '' : " AND program='null'"};
${fill(identities.client.id, coached)}
${fill(identities.solo.id, solo)}
${extraClients
  .map((c) => {
    const membership = `local-form-membership-${c.id.split('-').at(-1)}`;
    const active = c.status === 'active';
    return `INSERT OR IGNORE INTO fitness_accounts (user_id,data,revision,updated_at) VALUES (${quote(c.id)},${json(EMPTY)},0,${quote(now)});
INSERT OR IGNORE INTO coaching_memberships
(id,coach_id,trainee_id,email,name,status,token_hash,expires_at,offer,intake,program,nutrition,revision,created_at,accepted_at,open_key)
VALUES (${quote(membership)},${quote(identities.coach.id)},${quote(c.id)},${quote(c.email)},${quote(c.name)},${quote(c.status)},${quote(`local-form-fixture-${c.id}`)},
'2099-01-01T00:00:00.000Z',${json(profile.offers[0])},
${json({ goals: active ? 'Build strength' : 'Lose weight and feel stronger', experience: 'Intermediate', equipment: 'Gym', limitations: '', days: 3, country: 'QA' })},
${active ? json(program) : "'null'"},'null',0,${quote(now)},${active ? quote(now) : 'NULL'},${quote(`local-form-coach:${c.id}`)});
${c.history ? fill(c.id, coachedHistory(program, membership, new Date(), c.history)) : ''}`;
  })
  .join('\n')}
`;
await mkdir('.wrangler', { recursive: true });
const file = `.wrangler/seed-${process.pid}.sql`;
try {
  await writeFile(file, sql);
  const result = spawnSync(
    'npx',
    [
      'wrangler',
      'd1',
      'execute',
      'DB',
      '--local',
      '--config',
      'wrangler.local.json',
      '--file',
      file,
    ],
    { stdio: 'inherit', shell: process.platform === 'win32' },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  else
    console.log(
      refresh
        ? 'Local fixtures refreshed with sample history for Alex, Riley and the extra clients.'
        : 'Local coach/client fixtures are ready. Existing fixture progress was preserved; empty logs received sample history.',
    );
} finally {
  await unlink(file).catch(() => {});
}
