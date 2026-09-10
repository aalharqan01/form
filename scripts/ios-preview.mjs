import { spawn, spawnSync } from 'node:child_process';
const result = spawnSync(
  'xcrun',
  ['simctl', 'list', 'devices', 'available', '--json'],
  { encoding: 'utf8' },
);
if (result.status !== 0) {
  console.error(
    'iOS Simulator is not configured. Install Xcode from the Mac App Store, launch it to finish setup, and install an iOS Simulator runtime in Xcode Settings → Components. Then run npm run mobile:ios again.',
  );
  process.exit(1);
}
const simulators = Object.values(JSON.parse(result.stdout).devices)
  .flat()
  .filter((d) => d.name.startsWith('iPhone'));
if (!simulators.length) {
  console.error(
    'No iPhone simulator is available. Add an iOS runtime and iPhone simulator in Xcode, then retry.',
  );
  process.exit(1);
}
const child = spawn('npm', ['--prefix', 'mobile', 'run', 'ios'], {
  stdio: 'inherit',
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
