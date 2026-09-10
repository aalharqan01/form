import { spawnSync } from 'node:child_process';
const result = spawnSync('npm', ['run', 'build'], {
  env: { ...process.env, FORM_DEPLOY_TARGET: 'cloudflare' },
  stdio: 'inherit',
  shell: process.platform === 'win32',
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
