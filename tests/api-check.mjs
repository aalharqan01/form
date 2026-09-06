import assert from 'node:assert/strict';
import { EMPTY } from '../lib/fitness.ts';
const base = process.env.FORM_TEST_ORIGIN || 'http://localhost:3002';
assert.equal(
  (await fetch(base + '/api/data')).status,
  401,
  'anonymous reads must be blocked',
);
const signIn = await fetch(base + '/signin-with-chatgpt?return_to=%2F', {
  redirect: 'manual',
});
const cookie = signIn.headers.get('set-cookie')?.split(';')[0];
assert.ok(cookie, 'local sign-in must issue a cookie');
async function get() {
  const r = await fetch(base + '/api/data', { headers: { Cookie: cookie } });
  assert.equal(r.status, 200, await r.clone().text());
  return r.json();
}
async function put(data, revision, extra = {}) {
  const r = await fetch(base + '/api/data', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Cookie: cookie, ...extra },
    body: JSON.stringify({ data, revision }),
  });
  const text = await r.text();
  let result = {};
  try {
    result = JSON.parse(text);
  } catch {}
  return { status: r.status, ...result };
}
const initial = await get();
let revision = initial.revision;
try {
  const active = {
    id: 'test-workout',
    name: 'Persistence verification',
    startedAt: new Date().toISOString(),
    notes: 'Local verification only',
    exercises: [
      {
        id: 'test-exercise',
        name: 'Bench press',
        muscle: 'Chest',
        unit: 'lb',
        sets: [
          {
            id: 'test-set',
            kg: '40',
            load: '88.18490487395103',
            kind: 'working',
            reps: '10',
            done: true,
          },
        ],
      },
    ],
  };
  const testData = {
    ...EMPTY,
    active,
    weights: [{ date: '2026-01-01', kg: 77.7, note: 'Local verification' }],
    routines: [
      {
        id: 'test-routine',
        name: 'Upper body',
        exercises: [
          { name: 'Bench press', muscle: 'Chest', sets: 3, reps: 10 },
        ],
      },
    ],
  };
  const saved = await put(testData, revision);
  assert.equal(saved.status, 200);
  revision = saved.revision;
  assert.deepEqual((await get()).data, testData);
  assert.equal(
    (await put(testData, revision - 1)).status,
    409,
    'stale save must not overwrite',
  );
  assert.equal((await put({ ...testData, goal: -5 }, revision)).status, 400);
  assert.equal(
    (await put(testData, revision, { Origin: 'https://other.example' })).status,
    403,
  );
  const completed = {
    ...testData,
    active: null,
    workouts: [{ ...active, finishedAt: new Date().toISOString() }],
  };
  const saved2 = await put(completed, revision);
  assert.equal(saved2.status, 200);
  revision = saved2.revision;
  assert.equal((await get()).data.workouts[0].exercises[0].sets[0].kg, '40');
  console.log(
    'PASS: save/readback, active workout recovery, routine persistence, weight persistence, workout completion, stale-write protection, validation and origin checks.',
  );
} finally {
  const latest = await get();
  const restored = await put(initial.data, latest.revision);
  assert.equal(restored.status, 200);
  console.log('Local verification data removed; original data restored.');
}
