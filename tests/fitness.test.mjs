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

test('native training copies routines, preserves video instructions and converts display units without changing stored load', async () => {
  const {
    startTraining,
    changeExerciseUnit,
    routineFromWorkout,
    restRemaining,
  } = await import('../lib/training.ts');
  let n = 0;
  const routine = {
    id: 'day',
    name: 'Technique & Strength',
    exercises: [
      {
        name: 'Bench press',
        muscle: 'Chest',
        sets: 2,
        reps: 8,
        unit: 'kg',
        instructions: 'Pause at the bottom.',
        restSeconds: 120,
        videoUrl: 'https://www.youtube.com/watch?v=abcdefghijk',
      },
    ],
  };
  const workout = startTraining(
    routine,
    () => String(++n),
    'member',
    new Date('2026-09-10T10:00:00Z'),
  );
  assert.equal(workout.programSessionId, 'day');
  assert.equal(workout.exercises[0].restSeconds, 120);
  assert.equal(workout.exercises[0].videoUrl, routine.exercises[0].videoUrl);
  workout.exercises[0].sets[0] = {
    ...workout.exercises[0].sets[0],
    kg: '100',
    load: '100',
    done: true,
  };
  const pounds = changeExerciseUnit(workout.exercises[0], 'lb');
  assert.equal(pounds.sets[0].kg, '100');
  assert.equal(pounds.sets[0].load, '220.46');
  assert.equal(changeExerciseUnit(pounds, 'kg').sets[0].load, '100');
  const saved = routineFromWorkout(workout, 'routine-copy', 'My strength day');
  assert.equal(saved.exercises[0].sets, 2);
  assert.equal(saved.exercises[0].restSeconds, 120);
  saved.exercises[0].restSeconds = 45;
  assert.equal(workout.exercises[0].restSeconds, 120);
  assert.equal(
    validateData({
      ...EMPTY,
      active: {
        ...workout,
        exercises: [{ ...workout.exercises[0], restSeconds: -1 }],
      },
    }),
    false,
  );
  saved.exercises[0].name = 'Changed';
  assert.equal(workout.exercises[0].name, 'Bench press');
  assert.equal(routine.exercises[0].sets, 2);
  assert.equal(startTraining(null, () => String(++n)).membershipId, undefined);
  assert.equal(restRemaining(10000, 1501), 9);
  assert.equal(restRemaining(10000, 15000), 0);
  assert.equal(restRemaining(null, 15000), 0);
  assert.ok(validateData({ ...EMPTY, active: workout }));
});
test('pausing a workout excludes paused time from its duration and validates', async () => {
  const { pauseWorkout, resumeWorkout, workoutSeconds, pausedSeconds } =
    await import('../lib/fitness.ts');
  const start = Date.parse('2026-09-12T10:00:00.000Z');
  const workout = {
    id: 'w1',
    name: 'Push',
    startedAt: new Date(start).toISOString(),
    notes: '',
    exercises: [],
  };
  const paused = pauseWorkout(workout, new Date(start + 60000));
  assert.equal(
    pauseWorkout(paused, new Date(start + 90000)).pausedAt,
    paused.pausedAt,
  );
  assert.equal(pausedSeconds(paused, start + 90000), 30);
  assert.equal(workoutSeconds(paused, start + 90000), 60);
  const resumed = resumeWorkout(paused, new Date(start + 120000));
  assert.equal(resumed.pausedAt, undefined);
  assert.equal(resumed.pausedSeconds, 60);
  assert.equal(workoutSeconds(resumed, start + 300000), 240);
  assert.equal(resumeWorkout(resumed), resumed);
  assert.ok(validateData({ ...EMPTY, active: resumed }));
  assert.ok(validateData({ ...EMPTY, active: paused }));
  assert.ok(
    !validateData({ ...EMPTY, active: { ...resumed, pausedSeconds: -1 } }),
  );
  assert.ok(
    !validateData({ ...EMPTY, active: { ...resumed, pausedAt: 'soon' } }),
  );
});

test('daily steps validate, merge by date, and average over logged days only', async () => {
  const { stepsAverage, stepsOn } = await import('../lib/fitness.ts');
  const ok = {
    ...EMPTY,
    steps: [
      { date: '2026-09-10', count: 8200 },
      { date: '2026-09-12', count: 4000 },
    ],
    stepGoal: 8000,
  };
  assert.ok(validateData(ok));
  assert.ok(validateData({ ...EMPTY, steps: undefined, stepGoal: undefined }));
  assert.ok(
    !validateData({ ...EMPTY, steps: [{ date: '2026-09-10', count: 1.5 }] }),
  );
  assert.ok(
    !validateData({
      ...EMPTY,
      steps: [
        { date: '2026-09-10', count: 1 },
        { date: '2026-09-10', count: 2 },
      ],
    }),
  );
  assert.ok(!validateData({ ...EMPTY, stepGoal: 100 }));
  assert.equal(stepsOn(ok, '2026-09-12'), 4000);
  assert.equal(stepsOn(ok, '2026-09-11'), null);
  const now = new Date(2026, 8, 12, 15, 0, 0);
  assert.deepEqual(stepsAverage(ok.steps, 7, now), { days: 2, average: 6100 });
  assert.deepEqual(stepsAverage(ok.steps, 1, now), { days: 1, average: 4000 });
  assert.deepEqual(stepsAverage([], 7, now), { days: 0, average: null });
});
