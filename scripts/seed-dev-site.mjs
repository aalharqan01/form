import { mkdir, writeFile, unlink } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { seedSql } from '../dev/seed-sql.ts';
import { COACH_NAME } from '../dev/fixtures.ts';

// Seeds the DEVELOPMENT site's database (never production) with the same
// sample coach, clients and history the local launcher uses, keyed to real
// Cloudflare Access accounts. Requires `npx wrangler login`.
//
//   node --experimental-strip-types scripts/seed-dev-site.mjs \
//     --coach-id cf-access:<uuid> --client-email someone@example.com \
//     --client-name "Their Name" [--client-id cf-access:<uuid>] [--refresh]
//
// The coach's own account also receives the independent-trainee history, so
// the coach's /app/ shows the free-tier view with data. The client's log and
// membership wait on the email until that person signs in for the first time.
const args = new Map();
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (!arg.startsWith('--')) continue;
  const next = process.argv[i + 1];
  if (next && !next.startsWith('--')) {
    args.set(arg.slice(2), next);
    i++;
  } else args.set(arg.slice(2), true);
}
const database = args.get('database') || 'form-dev-db';
const coachId = args.get('coach-id');
const clientEmail = args.get('client-email');
if (
  !/^cf-access:[0-9a-f-]{36}$/.test(String(coachId)) ||
  !String(clientEmail).includes('@')
)
  throw new Error(
    'Usage: --coach-id cf-access:<uuid> --client-email <email> [--client-name <name>] [--client-id cf-access:<uuid>] [--database form-dev-db] [--refresh]',
  );
if (!/^[a-z0-9-]+-dev-db$|^form-dev-db$/.test(database))
  throw new Error(
    'Refusing to seed a database that is not a development database.',
  );
const sql = seedSql({
  prefix: 'dev-form',
  coach: { id: String(coachId), name: COACH_NAME },
  client: {
    id: args.get('client-id') ? String(args.get('client-id')) : null,
    email: String(clientEmail),
    name: String(args.get('client-name') || clientEmail),
  },
  solo: { id: String(coachId) },
  refresh: args.get('refresh') === true,
});
await mkdir('.wrangler', { recursive: true });
const file = `.wrangler/seed-dev-${process.pid}.sql`;
try {
  await writeFile(file, sql);
  const result = spawnSync(
    'npx',
    ['wrangler', 'd1', 'execute', database, '--remote', '--file', file],
    {
      stdio: 'inherit',
      shell: process.platform === 'win32',
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  else
    console.log(
      `Development site seeded on ${database}: coach ${COACH_NAME}, client ${clientEmail}, extra clients and sample history.`,
    );
} finally {
  await unlink(file).catch(() => {});
}
