import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { EMPTY } from '../lib/fitness.ts';
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
const sql = `
INSERT OR IGNORE INTO coach_profiles (user_id,profile,revision,updated_at)
VALUES (${quote(identities.coach.id)},${json(profile)},0,${quote(now)});
INSERT OR IGNORE INTO fitness_accounts (user_id,data,revision,updated_at)
VALUES (${quote(identities.client.id)},${json(EMPTY)},0,${quote(now)});
INSERT OR IGNORE INTO coaching_memberships
(id,coach_id,trainee_id,email,name,status,token_hash,expires_at,offer,intake,program,nutrition,revision,created_at,accepted_at,open_key)
VALUES ('local-form-membership',${quote(identities.coach.id)},${quote(identities.client.id)},
${quote(identities.client.email)},${quote(identities.client.name)},'active','local-form-fixture-not-an-invitation',
'2099-01-01T00:00:00.000Z',${json(profile.offers[0])},
${json({ goals: 'Build strength', experience: 'Beginner', equipment: 'Gym', limitations: '', days: 3, country: 'QA' })},
'null','null',0,${quote(now)},${quote(now)},'local-form-coach:local-form-client');
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
