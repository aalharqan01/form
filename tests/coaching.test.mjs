import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';
const temp = await mkdtemp(tmpdir() + '/form-coaching-test-');
after(async () => {
  await rm(temp, { recursive: true, force: true });
});
for (const name of [
  'fitness',
  'coaching',
  'coaching-server',
  'simulation',
  'video',
  'video-server',
]) {
  const source = await readFile(`lib/${name}.ts`, 'utf8');
  const code = ts
    .transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
      },
    })
    .outputText.replace(/from '\.\/(fitness|coaching)'/g, "from './$1.mjs'");
  await writeFile(`${temp}/${name}.mjs`, code);
}
const { handleCoaching } = await import(
  pathToFileURL(`${temp}/coaching-server.mjs`).href
);
const { EMPTY } = await import(pathToFileURL(`${temp}/fitness.mjs`).href);
const { isProgram, memberStats, templateRoutine, sessionFromTemplate } =
  await import(pathToFileURL(`${temp}/coaching.mjs`).href);
function memoryDB() {
  const sql = new DatabaseSync(':memory:');
  return {
    sql,
    prepare(query) {
      let params = [];
      return {
        bind(...p) {
          params = p;
          return this;
        },
        async first() {
          return sql.prepare(query).get(...params) ?? null;
        },
        async all() {
          return { results: sql.prepare(query).all(...params) };
        },
        async run() {
          const r = sql.prepare(query).run(...params);
          return { meta: { changes: Number(r.changes) } };
        },
      };
    },
    async batch(statements) {
      sql.exec('BEGIN');
      try {
        const results = [];
        for (const s of statements) results.push(await s.run());
        sql.exec('COMMIT');
        return results;
      } catch (e) {
        sql.exec('ROLLBACK');
        throw e;
      }
    },
  };
}
const user = (id) => ({
  userId: id,
  email: id + '@example.com',
  displayName: id,
  fullName: id,
});
const coach = user('coach'),
  trainee = user('trainee'),
  stranger = user('stranger');
const profile = {
  name: 'Coach One',
  bio: 'Strength coaching',
  country: 'QA',
  specialties: 'Strength',
  offers: [
    {
      id: 'o1',
      name: 'Personal coaching',
      price: 500,
      currency: 'QAR',
      description: 'Weekly program and check-ins',
      responseHours: 48,
    },
  ],
};
const intake = {
  goals: 'Build strength',
  experience: 'Intermediate',
  equipment: 'Gym',
  limitations: '',
  days: 3,
  country: 'SA',
};
const program = {
  title: 'Strength block',
  notes: 'Controlled reps',
  startDate: '2026-09-01',
  sessions: [
    {
      id: 's1',
      name: 'Upper',
      day: 2,
      exercises: [
        {
          name: 'Row',
          muscle: 'Back',
          sets: 3,
          reps: 10,
          unit: 'lb',
          instructions: 'Pause at the top',
          videoUrl: 'https://example.com/video',
        },
      ],
    },
  ],
};
test('coach-client lifecycle enforces identity, consent, ownership, persistence and revocation', async () => {
  const db = memoryDB();
  for (const name of [
    '0000_illegal_bug.sql',
    '0001_dapper_magma.sql',
    '0002_perpetual_bloodaxe.sql',
    '0003_normal_thunderbird.sql',
  ])
    db.sql.exec(await readFile('drizzle/' + name, 'utf8'));
  async function call(who, body, query = '', origin) {
    const r = await handleCoaching(
      db,
      who,
      new Request(
        'https://form.test/api/coaching' + query,
        body
          ? {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(origin ? { Origin: origin } : {}),
              },
              body: JSON.stringify(body),
            }
          : {},
      ),
    );
    return { status: r.status, body: await r.json() };
  }
  assert.equal((await call(null)).status, 401);
  assert.equal(
    (
      await call(
        coach,
        { action: 'profile', profile, revision: 0 },
        '',
        'https://evil.test',
      )
    ).status,
    403,
  );
  assert.equal(
    (await call(coach, { action: 'profile', profile, revision: 0 })).status,
    200,
  );
  assert.equal(
    (await call(coach, { action: 'profile', profile, revision: 0 })).status,
    409,
  );
  assert.equal((await call(coach, { action: 'invite' })).status, 410);
  assert.equal(
    (await call(trainee, { action: 'accept', consent: true })).status,
    410,
  );
  assert.equal(
    (await call(trainee, null, '?marketplace=1')).body.coaches.length,
    0,
  );
  assert.equal(
    (
      await call(coach, {
        action: 'profile',
        profile: { ...profile, listed: true },
        revision: 1,
      })
    ).status,
    200,
  );
  const catalog = (await call(trainee, null, '?marketplace=1')).body.coaches;
  assert.equal(catalog.length, 1);
  assert.equal(catalog[0].coachId, coach.userId);
  assert.equal('email' in catalog[0], false);
  const request = {
    action: 'request',
    coachId: coach.userId,
    profileRevision: 2,
    offerId: 'o1',
    name: 'Trainee',
    intake,
    consent: true,
  };
  assert.equal((await call(coach, request)).status, 400);
  assert.equal(
    (await call(trainee, { ...request, consent: false })).status,
    400,
  );
  assert.equal(
    (await call(trainee, { ...request, profileRevision: 1 })).status,
    409,
  );
  const sent = await call(trainee, request);
  assert.equal(sent.status, 200);
  const memberId = sent.body.id;
  assert.equal((await call(coach, null, '?notifications=1')).body.reviews, 1);
  assert.equal((await call(trainee, request)).status, 409);
  let pending = (await call(coach, null, '?member=' + memberId)).body;
  assert.equal(pending.member.status, 'requested');
  assert.equal(pending.fitness, null);
  assert.equal(pending.member.intake.goals, intake.goals);
  assert.equal(
    (await call(trainee, { action: 'checkout', memberId })).status,
    409,
  );
  assert.equal(
    (await call(trainee, { action: 'decision', memberId, decision: 'accept' }))
      .status,
    403,
  );
  assert.equal(
    (await call(stranger, { action: 'decision', memberId, decision: 'accept' }))
      .status,
    404,
  );
  assert.equal(
    (
      await call(coach, {
        action: 'decision',
        memberId,
        decision: 'accept',
        note: 'Happy to work together.',
      })
    ).status,
    200,
  );
  assert.equal(
    (await call(coach, { action: 'decision', memberId, decision: 'reject' }))
      .status,
    409,
  );
  pending = (await call(trainee, null, '?member=' + memberId)).body;
  assert.equal(pending.member.status, 'awaiting_payment');
  assert.equal(
    (await call(trainee, null, '?notifications=1')).body.payments,
    1,
  );
  assert.equal(
    (await call(stranger, null, '?notifications=1')).body.payments,
    0,
  );
  assert.equal(pending.member.accepted_at, null);
  assert.equal(pending.fitness, null);
  assert.equal(
    (await call(trainee, { action: 'checkout', memberId })).status,
    503,
  );
  assert.equal(
    (await call(coach, { action: 'program', memberId, program, revision: 1 }))
      .status,
    403,
  );
  assert.equal(
    (
      await call(trainee, {
        action: 'message',
        memberId,
        id: 'unpaid',
        body: 'Hello',
      })
    ).status,
    403,
  );
  assert.equal(
    (await call(trainee, { action: 'activate', memberId, paid: true })).status,
    403,
  );
  assert.equal(
    (await call(trainee, null, '?member=' + memberId)).body.member.status,
    'awaiting_payment',
  );
  // Seed an existing active membership ONLY in the isolated test DB to retain
  // coverage of the established paid/legacy coaching features. No activation API exists.
  db.sql
    .prepare(
      "UPDATE coaching_memberships SET status='active',accepted_at=? WHERE id=?",
    )
    .run(new Date().toISOString(), memberId);
  const list = (await call(coach)).body;
  assert.equal(list.clients.length, 1);
  assert.equal(list.clients[0].intake.country, 'SA');
  assert.equal(list.billing.enabled, false);
  assert.equal('token_hash' in list.clients[0], false);
  assert.equal((await call(stranger, null, '?member=' + memberId)).status, 404);
  assert.equal(
    (
      await call(stranger, {
        action: 'message',
        memberId,
        id: 'evil',
        body: 'tamper',
      })
    ).status,
    404,
  );
  assert.equal(
    (await call(trainee, { action: 'program', memberId, program, revision: 1 }))
      .status,
    403,
  );
  assert.equal(
    (await call(coach, { action: 'program', memberId, program, revision: 1 }))
      .status,
    200,
  );
  assert.equal(
    (await call(coach, { action: 'program', memberId, program, revision: 1 }))
      .status,
    409,
  );
  assert.deepEqual(
    (await call(trainee, null, '?member=' + memberId)).body.member.program,
    program,
  );
  const nutrition = {
    calories: 2200,
    protein: 160,
    carbs: 250,
    fat: 62,
    notes: 'Training days',
  };
  assert.equal(
    (
      await call(trainee, {
        action: 'nutrition',
        memberId,
        nutrition,
        revision: 2,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call(coach, {
        action: 'nutrition',
        memberId,
        nutrition: { ...nutrition, protein: -1 },
        revision: 2,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call(coach, {
        action: 'nutrition',
        memberId,
        nutrition,
        revision: 2,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await call(coach, {
        action: 'nutrition',
        memberId,
        nutrition,
        revision: 2,
      })
    ).status,
    409,
  );
  assert.deepEqual(
    (await call(trainee, null, '?member=' + memberId)).body.member.nutrition,
    nutrition,
  );
  const fitness = {
    ...EMPTY,
    weights: [{ date: '2026-09-08', kg: 80, note: '' }],
    workouts: [
      {
        id: 'w',
        membershipId: memberId,
        programSessionId: 's1',
        name: 'Upper',
        startedAt: '2026-09-08T09:00:00Z',
        finishedAt: '2026-09-08T10:00:00Z',
        exercises: [
          {
            id: 'e',
            name: 'Row',
            muscle: 'Back',
            unit: 'lb',
            sets: [{ id: 'set', kg: '45.359237', reps: '10', done: true }],
          },
        ],
        notes: '',
      },
    ],
  };
  db.sql
    .prepare(
      'INSERT INTO fitness_accounts (user_id,data,revision,updated_at) VALUES (?,?,0,?)',
    )
    .run(trainee.userId, JSON.stringify(fitness), new Date().toISOString());
  assert.deepEqual(
    (await call(coach, null, '?member=' + memberId)).body.fitness,
    fitness,
  );
  const message = {
    action: 'message',
    memberId,
    id: 'message1',
    body: 'How did the last set feel?',
  };
  assert.equal((await call(coach, message)).status, 200);
  assert.equal((await call(coach, message)).status, 200);
  let detail = (await call(trainee, null, '?member=' + memberId)).body;
  assert.equal(detail.messages.length, 1);
  assert.equal(detail.member.unread, 1);
  assert.equal(
    (
      await call(trainee, {
        action: 'read',
        memberId,
        through: detail.messages[0].created_at,
      })
    ).status,
    200,
  );
  detail = (await call(trainee, null, '?member=' + memberId)).body;
  assert.equal(detail.member.unread, 0);
  const checkin = {
    action: 'checkin',
    memberId,
    answers: {
      energy: 4,
      sleep: 7,
      wins: 'Consistent training',
      challenges: 'Need a lighter row',
    },
  };
  assert.equal((await call(coach, checkin)).status, 403);
  assert.equal((await call(trainee, checkin)).status, 200);
  assert.equal((await call(trainee, checkin)).status, 200);
  detail = (await call(coach, null, '?member=' + memberId)).body;
  assert.equal(detail.checkins.length, 1);
  assert.equal(detail.member.pending, 1);
  const feedback = {
    action: 'feedback',
    memberId,
    checkinId: detail.checkins[0].id,
    feedback: 'Reduce the load for the next session.',
  };
  assert.equal((await call(trainee, feedback)).status, 403);
  assert.equal((await call(coach, feedback)).status, 200);
  detail = (await call(trainee, null, '?member=' + memberId)).body;
  assert.equal(detail.checkins[0].feedback, feedback.feedback);
  assert.equal(detail.member.pending, 0);
  assert.equal(
    (await call(trainee, { action: 'checkout', memberId })).status,
    409,
  );
  assert.equal((await call(trainee, { action: 'end', memberId })).status, 200);
  detail = (await call(coach, null, '?member=' + memberId)).body;
  assert.equal(detail.fitness, null);
  assert.deepEqual(detail.member.intake, {});
  assert.equal(detail.member.nutrition, null);
  assert.equal(detail.messages.length, 0);
  assert.equal(detail.member.program, null);
  assert.equal((await call(coach, { ...message, id: 'message2' })).status, 403);
  assert.equal(
    JSON.parse(
      db.sql
        .prepare('SELECT data FROM fitness_accounts WHERE user_id=?')
        .get(trainee.userId).data,
    ).weights[0].kg,
    80,
  );
  const next = await call(trainee, request);
  assert.equal(next.status, 200);
  assert.equal(
    (
      await call(coach, {
        action: 'decision',
        memberId: next.body.id,
        decision: 'reject',
        note: 'Capacity full',
      })
    ).status,
    200,
  );
  assert.equal(
    (await call(trainee, null, '?member=' + next.body.id)).body.member
      .decision_note,
    'Capacity full',
  );
  const third = await call(trainee, request);
  assert.equal(third.status, 200);
  assert.equal(
    (await call(trainee, { action: 'withdraw', memberId: third.body.id }))
      .status,
    200,
  );
  assert.equal(
    (
      await call(coach, {
        action: 'decision',
        memberId: third.body.id,
        decision: 'accept',
      })
    ).status,
    409,
  );
  db.sql.close();
});
test('program validation and adherence use actual session links, not matching workout names', () => {
  assert.ok(isProgram(program));
  assert.equal(isProgram({ ...program, startDate: '2026-02-30' }), false);
  const unsafe = structuredClone(program);
  unsafe.sessions[0].exercises[0].videoUrl = 'javascript:alert(1)';
  assert.equal(isProgram(unsafe), false);
  const member = { id: 'm', program };
  const w = {
    id: 'w',
    name: 'Upper',
    startedAt: '2026-09-08T10:00:00Z',
    exercises: [],
    notes: '',
  };
  assert.equal(
    memberStats(
      { ...EMPTY, workouts: [w] },
      member,
      new Date('2026-09-08T12:00:00Z'),
    ).completed,
    0,
  );
  assert.equal(
    memberStats(
      {
        ...EMPTY,
        workouts: [{ ...w, membershipId: 'm', programSessionId: 's1' }],
      },
      member,
      new Date('2026-09-08T12:00:00Z'),
    ).completed,
    1,
  );
});

test('simulation completes the coach-trainee workflow in isolated memory', async () => {
  const {
    createSimulationStore,
    simulatePayment,
    exampleProgram,
    startSimulationWorkout,
    addSimulationHistory,
  } = await import(pathToFileURL(`${temp}/simulation.mjs`).href);
  const store = createSimulationStore(),
    independent = createSimulationStore();
  const before = structuredClone(independent.getSnapshot());
  assert.throws(() => store.change(simulatePayment), /accept first/);
  store.request('trainee', '', {
    action: 'request',
    name: 'Alex',
    offerId: 'demo-package',
    intake,
    consent: true,
  });
  assert.equal(store.request('coach').clients[0].status, 'requested');
  store.request('coach', '', { action: 'decision', decision: 'accept' });
  assert.equal(store.request('coach', '?member=demo-membership').fitness, null);
  store.change(simulatePayment);
  store.request('coach', '', { action: 'program', program: exampleProgram() });
  const assigned = store.request('trainee', '?member=demo-membership').member
    .program;
  assert.equal(assigned.sessions[0].exercises[1].unit, 'lb');
  store.change((s) => startSimulationWorkout(s, assigned.sessions[0]));
  store.change((s) => {
    const workout = s.fitness.active;
    workout.exercises[0].sets[0] = {
      ...workout.exercises[0].sets[0],
      kg: '45',
      reps: '8',
      done: true,
    };
    s.fitness.workouts.push({
      ...workout,
      finishedAt: new Date().toISOString(),
    });
    s.fitness.active = null;
  });
  assert.equal(
    store.request('coach', '?member=demo-membership').fitness.workouts[0]
      .exercises[0].sets[0].kg,
    '45',
  );
  store.request('coach', '', {
    action: 'nutrition',
    nutrition: { calories: 2200, protein: 160, carbs: 250, fat: 62, notes: '' },
  });
  assert.equal(
    store.request('trainee', '?member=demo-membership').member.nutrition
      .protein,
    160,
  );
  assert.throws(() =>
    store.request('trainee', '', { action: 'nutrition', nutrition: null }),
  );
  store.change(addSimulationHistory);
  const result = store.request('coach', '?member=demo-membership');
  assert.equal(result.fitness.weights.length, 28);
  assert.ok(result.fitness.workouts.length >= 10);
  const { exerciseHistory, validateData } = await import(
    pathToFileURL(`${temp}/fitness.mjs`).href
  );
  assert.ok(validateData(result.fitness));
  assert.ok(
    exerciseHistory(result.fitness.workouts, 'Seated cable row').some(
      (p) => p.record,
    ),
  );
  store.request('trainee', '', {
    action: 'checkin',
    answers: { energy: 4, sleep: 7, wins: 'Consistent', challenges: '' },
  });
  const checkin = store.request('coach', '?member=demo-membership').checkins[0];
  store.request('coach', '', {
    action: 'feedback',
    checkinId: checkin.id,
    feedback: 'Increase by 2.5 kg next week.',
  });
  assert.equal(
    store.request('trainee', '?member=demo-membership').checkins[0].feedback,
    'Increase by 2.5 kg next week.',
  );
  store.request('trainee', '', {
    action: 'message',
    id: 'demo-msg',
    body: 'Thank you',
  });
  assert.equal(
    store.request('coach', '?member=demo-membership').messages[0].body,
    'Thank you',
  );
  assert.deepEqual(independent.getSnapshot(), before);
  store.reset();
  assert.equal(store.getSnapshot().member, null);
  assert.equal(store.getSnapshot().fitness.weights.length, 0);
});

test('weekly weight average uses only recorded days in the current UTC week', () => {
  const fitness = {
    ...structuredClone(EMPTY),
    weights: [
      { date: '2026-09-06', kg: 100, note: 'Previous Sunday' },
      { date: '2026-09-07', kg: 82, note: '' },
      { date: '2026-09-09', kg: 80, note: '' },
      { date: '2026-09-11', kg: 70, note: 'Future' },
    ],
  };
  const member = { id: 'client-a', program: null };
  const stats = memberStats(fitness, member, new Date('2026-09-10T23:00:00Z'));
  assert.equal(stats.averageKg, 81);
  assert.equal(stats.weightCount, 2);
  assert.equal(stats.weightWeek, '2026-09-07');
  assert.equal(stats.previousAverageKg, 100);
  assert.equal(stats.averageChangeKg, -19);
  assert.equal(
    memberStats(fitness, member, new Date('2026-09-14T00:00:00Z')).averageKg,
    null,
  );
  assert.equal(memberStats(null, member).weightCount, 0);
  assert.equal(
    fitness.weights.length,
    4,
    'summary does not remove historical entries',
  );
});

test('embedded videos use approved players and preserve direct files and Vimeo privacy hashes', async () => {
  const { exerciseVideo } = await import(
    pathToFileURL(`${temp}/video.mjs`).href
  );
  assert.equal(
    exerciseVideo('https://youtu.be/M7lc1UVf-VE?t=30').src,
    'https://www.youtube-nocookie.com/embed/M7lc1UVf-VE?playsinline=1&rel=0',
  );
  assert.equal(
    exerciseVideo('https://www.youtube.com/watch?v=M7lc1UVf-VE').kind,
    'embed',
  );
  assert.equal(
    exerciseVideo('https://www.youtube.com/shorts/M7lc1UVf-VE').kind,
    'embed',
  );
  assert.equal(
    exerciseVideo('https://vimeo.com/123456789/abc123').src,
    'https://player.vimeo.com/video/123456789?h=abc123&dnt=1',
  );
  assert.equal(
    exerciseVideo('https://cdn.example.com/demo.mp4?token=abc').src,
    'https://cdn.example.com/demo.mp4?token=abc',
  );
  for (const invalid of [
    'javascript:alert(1)',
    'http://youtu.be/M7lc1UVf-VE',
    'https://youtube.com.evil.test/watch?v=M7lc1UVf-VE',
    'https://user:password@example.com/video.mp4',
    'https://example.com/page',
    'https://youtu.be/invalid',
    '<iframe src="https://example.com"/>',
  ])
    assert.equal(exerciseVideo(invalid), null);
});

test('video access is scoped to the active client, coach ownership, and valid byte ranges', async () => {
  const { handleVideo, videoRange } = await import(
    pathToFileURL(`${temp}/video-server.mjs`).href
  );
  const membership = {
    id: 'm',
    coach_id: 'coach',
    trainee_id: 'trainee',
    status: 'active',
  };
  const db = {
    prepare: () => ({ bind: () => ({ first: async () => membership }) }),
  };
  const meta = {
    size: 100,
    customMetadata: { membershipId: 'm' },
    writeHttpMetadata: (h) => h.set('Content-Type', 'video/mp4'),
  };
  let reads = 0;
  const bucket = {
    head: async () => meta,
    get: async (key, opts) => {
      reads++;
      return { body: new Uint8Array(opts?.range?.length ?? 100) };
    },
  };
  const url =
    'https://form.test/api/videos?id=12345678-1234-1234-1234-123456789abc';
  assert.equal(
    (await handleVideo(db, bucket, null, new Request(url))).status,
    401,
  );
  assert.equal(
    (await handleVideo(db, bucket, stranger, new Request(url))).status,
    403,
  );
  assert.equal(reads, 0);
  const r = await handleVideo(
    db,
    bucket,
    trainee,
    new Request(url, { headers: { Range: 'bytes=10-19' } }),
  );
  assert.equal(r.status, 206);
  assert.equal(r.headers.get('content-range'), 'bytes 10-19/100');
  assert.equal((await r.arrayBuffer()).byteLength, 10);
  membership.status = 'ended';
  assert.equal(
    (await handleVideo(db, bucket, trainee, new Request(url))).status,
    403,
  );
  assert.equal(
    (await handleVideo(db, bucket, coach, new Request(url))).status,
    200,
  );
  assert.equal(
    (
      await handleVideo(
        db,
        bucket,
        coach,
        new Request(url, { headers: { Range: 'bytes=100-' } }),
      )
    ).status,
    416,
  );
  assert.deepEqual(videoRange('bytes=-10', 100), { offset: 90, length: 10 });
  assert.deepEqual(videoRange('bytes=0-999', 100), { offset: 0, length: 100 });
  assert.throws(() => videoRange('bytes=10-1', 100));
  assert.throws(() => videoRange('bytes=0-1,4-5', 100));
  assert.equal(
    (
      await handleVideo(
        db,
        bucket,
        coach,
        new Request('https://form.test/api/videos?member=m', {
          method: 'POST',
          headers: { 'Content-Type': 'video/mp4', 'X-Video-Size': '20' },
          body: new Uint8Array(20),
        }),
      )
    ).status,
    403,
  );
  membership.status = 'active';
  const upload = (headers = {}) =>
    new Request('https://form.test/api/videos?member=m', {
      method: 'POST',
      headers: {
        'Content-Type': 'video/mp4',
        'X-Video-Size': '20',
        ...headers,
      },
      body: new Uint8Array(20),
    });
  assert.equal((await handleVideo(db, bucket, trainee, upload())).status, 403);
  assert.equal(
    (
      await handleVideo(
        db,
        bucket,
        coach,
        upload({ Origin: 'https://evil.test' }),
      )
    ).status,
    403,
  );
  assert.equal(
    (
      await handleVideo(
        db,
        bucket,
        coach,
        upload({ 'X-Video-Size': '999999999' }),
      )
    ).status,
    413,
  );
  assert.equal((await handleVideo(db, bucket, coach, upload())).status, 415);
});

test('private reusable templates enforce ownership and revision checks without sharing client videos', async () => {
  const db = memoryDB();
  for (const name of [
    '0000_illegal_bug',
    '0001_dapper_magma',
    '0002_perpetual_bloodaxe',
    '0003_normal_thunderbird',
    '0004_coach_workout_templates',
  ])
    db.sql.exec(await readFile(`drizzle/${name}.sql`, 'utf8'));
  const call = async (who, body, query = '') => {
    const response = await handleCoaching(
      db,
      who,
      new Request(
        'https://form.test/api/coaching' + query,
        body
          ? {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(body),
            }
          : {},
      ),
    );
    return { status: response.status, body: await response.json() };
  };
  assert.equal(
    (await call(coach, { action: 'profile', profile, revision: 0 })).status,
    200,
  );
  assert.equal(
    (await call(stranger, { action: 'profile', profile, revision: 0 })).status,
    200,
  );
  const source = structuredClone(program.sessions[0]);
  source.name = 'My custom workout day';
  source.exercises[0].videoUrl =
    '/api/videos?id=00000000-0000-4000-8000-000000000000';
  const routine = templateRoutine(source);
  assert.equal(routine.exercises[0].videoUrl, '');
  assert.match(source.exercises[0].videoUrl, /api\/videos/);
  assert.equal(
    (await call(coach, { action: 'template-save', routine: source })).status,
    400,
  );
  assert.equal(
    (await call(trainee, { action: 'template-save', routine })).status,
    403,
  );
  assert.equal((await call(null, null, '?templates=1')).status, 401);
  const created = await call(coach, { action: 'template-save', routine });
  assert.equal(created.status, 200);
  const templateId = created.body.id;
  const saved = (await call(coach, null, '?templates=1')).body.templates[0];
  assert.equal(saved.routine.name, 'My custom workout day');
  assert.deepEqual(
    (await call(stranger, null, '?templates=1')).body.templates,
    [],
  );
  assert.equal(
    (
      await call(stranger, {
        action: 'template-save',
        id: templateId,
        revision: 1,
        routine,
      })
    ).status,
    409,
  );
  const assigned = sessionFromTemplate(saved.routine, 'client-session', 4);
  assigned.exercises[0].sets = 9;
  assert.notEqual(saved.routine.exercises[0].sets, 9);
  assert.equal(assigned.day, 4);
  assert.equal(assigned.id, 'client-session');
  routine.name = 'Edited template';
  assert.equal(
    (
      await call(coach, {
        action: 'template-save',
        id: templateId,
        revision: 1,
        routine,
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await call(coach, {
        action: 'template-save',
        id: templateId,
        revision: 1,
        routine,
      })
    ).status,
    409,
  );
  assert.equal(assigned.name, 'My custom workout day');
  assert.equal(
    (
      await call(coach, {
        action: 'template-save',
        routine: { ...routine, exercises: [] },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call(coach, {
        action: 'template-save',
        routine: { ...routine, name: '' },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await call(coach, {
        action: 'template-save',
        routine: { ...routine, exercises: [null] },
      })
    ).status,
    400,
  );
  db.sql.close();
});
