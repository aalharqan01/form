import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { identities } from '../dev/roles.ts';
import { seedSql } from '../lib/seed-sql.ts';

// Seeds the local database only, with reserved local-form-* fixture records.
// Sample history is filled in only where a fixture log is still empty, so
// progress you logged yourself survives every launch. `--refresh` rewrites the
// fixture logs, names and the coached program from the generator.
const refresh = process.argv.includes('--refresh');
const sql = seedSql({
  prefix: 'local-form',
  coach: { id: identities.coach.id, name: identities.coach.name },
  client: {
    id: identities.client.id,
    email: identities.client.email,
    name: identities.client.name,
  },
  solo: { id: identities.solo.id },
  refresh,
});
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
        ? 'Local fixtures refreshed with sample history for Abdullah, Sara and the extra clients.'
        : 'Local coach/client fixtures are ready. Existing fixture progress was preserved; empty logs received sample history.',
    );
} finally {
  await unlink(file).catch(() => {});
}
