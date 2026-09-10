import { spawnSync } from 'node:child_process';
// Offline configuration fixtures. This command NEVER deploys or uses account credentials.
const env = {
  ...process.env,
  FORM_CONFIG_FILE: '.cloudflare/verify.json',
  CLOUDFLARE_ACCOUNT_ID: '0'.repeat(32),
  FORM_D1_DATABASE_ID: '00000000-0000-0000-0000-000000000000',
  FORM_R2_BUCKET: 'form-verification',
  FORM_ACCESS_TEAM_DOMAIN: 'https://form-verification.cloudflareaccess.com',
  FORM_ACCESS_AUD: '0'.repeat(64),
  FORM_WORKER_NAME: 'form-verification',
};
delete env.CLOUDFLARE_API_TOKEN;
for (const args of [
  ['scripts/configure-cloudflare.mjs'],
  ['scripts/build-cloudflare.mjs'],
]) {
  const result = spawnSync(process.execPath, args, { env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const result = spawnSync(
  'npx',
  ['wrangler', 'deploy', '--dry-run', '--config', 'dist/server/wrangler.json'],
  { env, stdio: 'inherit', shell: process.platform === 'win32' },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
