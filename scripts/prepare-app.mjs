import { spawnSync } from 'node:child_process';
import { cp, rm, stat } from 'node:fs/promises';

// Exports the Expo trainee app for the web under /app and copies it into the
// website's client bundle so one Worker serves the site, the app and the
// /__dev/phones preview. Run after `vinext build`.
const mobileModules = await stat('mobile/node_modules').catch(() => null);
if (!mobileModules) {
  throw new Error('Install the app first: npm --prefix mobile ci');
}
const result = spawnSync(
  'npm',
  ['--prefix', 'mobile', 'run', 'export:web', '--', '--output-dir', 'dist'],
  {
    env: { ...process.env, FORM_APP_BASE_URL: '/app', CI: '1' },
    stdio: 'inherit',
    shell: process.platform === 'win32',
  },
);
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
await rm('dist/client/app', { recursive: true, force: true });
await cp('mobile/dist', 'dist/client/app', { recursive: true });
console.log('Trainee app exported to dist/client/app.');
