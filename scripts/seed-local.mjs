import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { EMPTY, STARTERS } from '../lib/fitness.ts';
import { identities } from '../dev/roles.ts';

// No remote option by design. Seed only reserved local-form-* fixture records.
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
    },
  ],
};
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
${templates.map((routine) => `INSERT OR IGNORE INTO coach_workout_templates (id,coach_id,routine,revision,updated_at) VALUES (${quote(routine.id)},${quote(identities.coach.id)},${json({ ...routine, exercises: routine.exercises.map((e, i) => ({ ...e, restSeconds: i < 2 ? 120 : 90 })) })},1,${quote(now)});`).join('\n')}
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
      'Local coach/client fixtures are ready. Existing fixture progress was preserved.',
    );
} finally {
  await unlink(file).catch(() => {});
}
