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
