import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY,
  smoothWeights,
  trendStats,
  validateData,
  volume,
  completedSets,
  displayWeight,
  toKg,
} from '../lib/fitness.ts';
test('trend is chronological, seeded by the first reading, and smoothed across date gaps', () => {
  const p = smoothWeights([
    { date: '2026-01-08', kg: 73, note: '' },
    { date: '2026-01-01', kg: 80, note: '' },
  ]);
  assert.equal(p[0].trend, 80);
  assert.ok(Math.abs(p[1].trend - (80 - 7 * (1 - Math.exp(-1)))) < 1e-10);
});
test('one point has no invented rate and an empty chart has no reading', () => {
  assert.equal(trendStats([], null).latest, null);
  assert.equal(
    trendStats([{ date: '2026-01-01', kg: 80, note: '' }], 70).rate,
    null,
  );
});
test('stable daily readings stay stable; positive and negative goal directions work', () => {
  const w = Array.from({ length: 10 }, (_, i) => ({
    date: `2026-01-${String(i + 1).padStart(2, '0')}`,
    kg: 80,
    note: '',
  }));
  assert.equal(trendStats(w, 70).rate, 0);
  assert.equal(trendStats(w, 90).remaining, 10);
  assert.equal(trendStats(w, 70).progress, 0);
  assert.equal(trendStats(w, 80).progress, 1);
});
test('unit conversions round-trip without changing canonical mass', () => {
  assert.ok(Math.abs(toKg(displayWeight(77.7, 'lb'), 'lb') - 77.7) < 1e-10);
});
test('backup validation rejects invalid dates, duplicate days, fractional reps and malformed payloads', () => {
  assert.ok(validateData(EMPTY));
  assert.ok(
    !validateData({
      ...EMPTY,
      weights: [{ date: '2026-02-30', kg: 80, note: '' }],
    }),
  );
  assert.ok(!validateData({ ...EMPTY, goal: NaN }));
  assert.ok(!validateData({}));
  const weight = { date: '2026-01-01', kg: 80, note: '' };
  assert.ok(!validateData({ ...EMPTY, weights: [weight, weight] }));
  const active = {
    id: 'w',
    name: 'Training',
    startedAt: new Date().toISOString(),
    notes: '',
    exercises: [
      {
        id: 'e',
        name: 'Squat',
        muscle: 'Legs',
        sets: [{ id: 's', kg: '40', reps: '2.5', done: true }],
      },
    ],
  };
  assert.ok(!validateData({ ...EMPTY, active }));
  active.exercises[0].sets[0].reps = '5';
  assert.ok(validateData({ ...EMPTY, active }));
});
test('volume and set count include only completed sets, including zero-load movements', () => {
  const w = {
    exercises: [
      {
        sets: [
          { kg: '50', reps: '10', done: true },
          { kg: '100', reps: '5', done: false },
          { kg: '0', reps: '12', done: true },
        ],
      },
    ],
  };
  assert.equal(volume(w), 500);
  assert.equal(completedSets(w), 2);
});

test('mixed-unit records use canonical mass and exclude warm-ups', async () => {
  const { exerciseHistory, lastPerformance } =
    await import('../lib/fitness.ts');
  const workout = (id, day, kg, unit) => ({
    id,
    name: 'Session',
    startedAt: `2026-01-${day}T12:00:00Z`,
    notes: '',
    exercises: [
      {
        id: 'e' + id,
        name: 'Press',
        muscle: 'Chest',
        unit,
        sets: [
          { id: 'w' + id, kg: '200', reps: '1', done: true, kind: 'warmup' },
          {
            id: 's' + id,
            kg: String(kg),
            reps: '8',
            done: true,
            kind: 'working',
          },
        ],
      },
    ],
  });
  const a = workout('a', '01', 40, 'kg');
  const b = workout('b', '03', toKg(100, 'lb'), 'lb');
  const points = exerciseHistory([b, a], 'Press');
  assert.equal(points[0].record, false);
  assert.equal(points[1].record, true);
  assert.equal(points[1].sets, 1);
  assert.ok(Math.abs(points[1].volume - toKg(800, 'lb')) < 1e-8);
  assert.equal(lastPerformance([b, a], 'Press')[0].id, 'sb');
  assert.ok(validateData({ ...EMPTY, workouts: [a, b] }));
  b.exercises[0].unit = 'stone';
  assert.equal(validateData({ ...EMPTY, workouts: [a, b] }), false);
});

test('weight forecast requires enough recent evidence and supports either goal direction', async () => {
  const { weightInsights } = await import('../lib/fitness.ts');
  const readings = (step) =>
    Array.from({ length: 21 }, (_, i) => ({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      kg: 80 + step * i,
      note: '',
    }));
  const down = weightInsights(readings(-0.1), 75, '2026-01-21');
  assert.equal(down.count, 7);
  assert.ok(Math.abs(down.average - 78.3) < 1e-8);
  assert.ok(down.estimate > '2026-01-21');
  assert.ok(weightInsights(readings(0.1), 85, '2026-01-21').estimate);
  assert.equal(weightInsights(readings(-0.1), 85, '2026-01-21').estimate, null);
  assert.equal(weightInsights(readings(0), 75, '2026-01-21').estimate, null);
  assert.equal(weightInsights(readings(-0.1), 75, '2026-03-01').estimate, null);
  assert.equal(
    weightInsights(readings(-0.1).slice(0, 7), 75, '2026-01-07').estimate,
    null,
  );
});

test('offline reconciliation preserves independent edits and recognizes an already-accepted save', async () => {
  const { mergeData } = await import('../lib/sync.ts');
  const base = structuredClone(EMPTY);
  const local = {
    ...base,
    weights: [{ date: '2026-01-01', kg: 80, note: '' }],
  };
  const remote = { ...base, goal: 75 };
  assert.deepEqual(mergeData(base, local, remote), { ...local, goal: 75 });
  assert.deepEqual(mergeData(base, local, local), local);
  const second = {
    ...base,
    weights: [{ date: '2026-01-02', kg: 79, note: '' }],
  };
  assert.equal(mergeData(base, local, second).weights.length, 2);
  assert.throws(
    () => mergeData(base, { ...base, goal: 70 }, { ...base, goal: 75 }),
    /Both devices/,
  );
  const changed = { ...local, weights: [{ ...local.weights[0], kg: 81 }] };
  assert.throws(() => mergeData(local, base, changed), /Both devices/);
});

test('offline worker serves its current shell and never intercepts private API or auth requests', async () => {
  const { readFile } = await import('node:fs/promises');
  const { runInNewContext } = await import('node:vm');
  const handlers = {};
  let shell;
  const fetched = [];
  const cache = {
    put: async (key, response) => {
      if (key === '/offline') shell = response;
    },
    addAll: async () => {},
    match: async () => shell?.clone(),
  };
  const context = {
    self: {
      addEventListener: (key, fn) => {
        handlers[key] = fn;
      },
      location: { origin: 'https://form.test' },
      skipWaiting: async () => {},
      clients: { claim: async () => {} },
    },
    caches: { open: async () => cache },
    fetch: async (url) => {
      fetched.push(url);
      return new Response('<html>FORM_OFFLINE_SHELL</html>');
    },
    URL,
    Response,
  };
  runInNewContext(await readFile('public/sw.js', 'utf8'), context);
  let install = Promise.resolve();
  handlers.install({
    waitUntil: (p) => {
      install = p;
    },
  });
  await install;
  assert.deepEqual(fetched, ['/offline']);
  context.fetch = async () => {
    throw new Error('offline');
  };
  let result = Promise.resolve(new Response());
  handlers.fetch({
    request: { url: 'https://form.test/', method: 'GET', mode: 'navigate' },
    respondWith: (p) => {
      result = p;
    },
  });
  assert.match(await (await result).text(), /FORM_OFFLINE_SHELL/);
  for (const path of [
    '/api/data',
    '/signin-with-chatgpt',
    '/signout-with-chatgpt',
  ]) {
    handlers.fetch({
      request: {
        url: 'https://form.test' + path,
        method: 'GET',
        mode: 'navigate',
      },
      respondWith: () => assert.fail('must not intercept ' + path),
    });
  }
  context.fetch = async () => new Response('<html>Sign in</html>');
  handlers.install({
    waitUntil: (p) => {
      install = p;
    },
  });
  await assert.rejects(install, /Sign in/);
});
