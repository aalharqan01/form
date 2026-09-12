import { mkdir, writeFile } from 'node:fs/promises';

const checks = {
  CLOUDFLARE_ACCOUNT_ID: /^[a-f0-9]{32}$/i,
  FORM_D1_DATABASE_ID:
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
  FORM_R2_BUCKET: /^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/,
  FORM_ACCESS_TEAM_DOMAIN: /^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/,
  FORM_ACCESS_AUD: /^[a-f0-9]{64}$/i,
};
for (const [name, pattern] of Object.entries(checks)) {
  if (!pattern.test(process.env[name] ?? ''))
    throw new Error(
      `Set a valid ${name} before configuring Cloudflare. See docs/DEPLOYMENT.md.`,
    );
}
const name = process.env.FORM_WORKER_NAME || 'form-staging';
if (!/^[a-z][a-z0-9-]{2,50}$/.test(name))
  throw new Error('Invalid FORM_WORKER_NAME');
await mkdir('.cloudflare', { recursive: true });
await writeFile(
  process.env.FORM_CONFIG_FILE || '.cloudflare/wrangler.json',
  JSON.stringify(
    {
      name,
      account_id: process.env.CLOUDFLARE_ACCOUNT_ID,
      main: '../workers/cloudflare.ts',
      compatibility_date: '2026-05-15',
      compatibility_flags: ['nodejs_compat'],
      workers_dev: true,
      preview_urls: false,
      assets: { binding: 'ASSETS', run_worker_first: true },
      vars: {
        ACCESS_TEAM_DOMAIN: process.env.FORM_ACCESS_TEAM_DOMAIN,
        ACCESS_AUD: process.env.FORM_ACCESS_AUD,
        // Developer preview identities: only ever 'true' on development targets.
        PREVIEW_ROLES:
          process.env.FORM_PREVIEW_ROLES === 'true' ? 'true' : 'false',
      },
      d1_databases: [
        {
          binding: 'DB',
          database_name: `${name}-db`,
          database_id: process.env.FORM_D1_DATABASE_ID,
          migrations_dir: '../drizzle',
        },
      ],
      r2_buckets: [
        { binding: 'VIDEOS', bucket_name: process.env.FORM_R2_BUCKET },
      ],
    },
    null,
    2,
  ) + '\n',
);
console.log('Cloudflare configuration generated. No resources were modified.');
