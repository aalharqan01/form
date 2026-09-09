import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedLocalRequest } from '../dev/roles.ts';
import {
  foundationProgram,
  startAssignedWorkout,
  editWorkoutSet,
  finishAssignedWorkout,
} from '../lib/mobile-workout.ts';

const local = (overrides = {}) => ({
  url: '/api/coaching',
  headers: { host: '127.0.0.1:3100' },
  socket: { remoteAddress: '127.0.0.1' },
  ...overrides,
});
test('role fixture rejects remote sockets, hosts, cross-site and forged request targets', () => {
  assert.equal(allowedLocalRequest(local()), true);
  assert.equal(
    allowedLocalRequest(local({ socket: { remoteAddress: '192.168.1.5' } })),
    false,
  );
  for (const headers of [
    { host: 'example.com' },
    { host: 'localhost.evil.test' },
    { host: '127.0.0.1:3100', origin: 'https://evil.test' },
    { host: '127.0.0.1:3100', 'sec-fetch-site': 'cross-site' },
  ]) {
    assert.equal(allowedLocalRequest(local({ headers })), false);
  }
  assert.equal(
    allowedLocalRequest(local({ url: 'http://evil.test/api/coaching' })),
    false,
  );
  assert.equal(
    allowedLocalRequest(
      local({
        headers: { host: '127.0.0.1:3100', origin: 'http://127.0.0.1:8081' },
      }),
    ),
    true,
  );
});
test('native workout preserves assignment attribution and rejects incomplete sets', () => {
  let counter = 0;
  const program = foundationProgram();
  program.sessions[0].exercises[0].unit = 'lb';
  let workout = startAssignedWorkout(
    program,
    'membership',
    () => `id-${counter++}`,
  );
  assert.equal(workout.membershipId, 'membership');
  assert.equal(workout.programSessionId, program.sessions[0].id);
  assert.throws(() => finishAssignedWorkout(workout), /Complete every set/);
  const first = workout.exercises[0];
  assert.throws(
    () => editWorkoutSet(workout, first.id, first.sets[0].id, { done: true }),
    /valid weight/,
  );
  for (const exercise of workout.exercises)
    for (const set of exercise.sets) {
      workout = editWorkoutSet(workout, exercise.id, set.id, {
        load: '100',
        reps: '8',
        done: true,
      });
    }
  assert.ok(
    Math.abs(Number(workout.exercises[0].sets[0].kg) - 45.3592) < 0.001,
  );
  assert.ok(finishAssignedWorkout(workout).finishedAt);
});
