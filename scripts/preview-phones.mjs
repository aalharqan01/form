import { webkit, chromium, devices } from '@playwright/test';

const native = process.argv.includes('--native');
const engine = process.argv.includes('--chromium') ? chromium : webkit;
const browser = await engine.launch({ headless: false });
for (const role of ['coach', 'client']) {
  const context = await browser.newContext({
    ...devices['iPhone 13'],
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  const url =
    role === 'coach'
      ? 'http://127.0.0.1:3100/coaching'
      : native
        ? 'http://127.0.0.1:8081/'
        : 'http://127.0.0.1:3101/';
  await page.goto(url);
}
console.log(
  'Coach and client iPhone previews are open in separate sessions. Close the browser or press Ctrl+C to stop.',
);
process.on('SIGINT', () => browser.close());
process.on('SIGTERM', () => browser.close());
await new Promise((resolve) => browser.on('disconnected', resolve));
