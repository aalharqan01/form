import { spawnSync } from 'node:child_process';
// Builds the website for the Cloudflare Worker, then exports the trainee app
// into the same client bundle (dist/client/app).
const steps = [
  {
    command: 'npm',
    args: ['run', 'build'],
    env: { FORM_DEPLOY_TARGET: 'cloudflare' },
  },
  { command: process.execPath, args: ['scripts/prepare-app.mjs'], env: {} },
];
for (const step of steps) {
  const result = spawnSync(step.command, step.args, {
    env: { ...process.env, ...step.env },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
