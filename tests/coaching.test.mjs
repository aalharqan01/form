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
for (const name of ['fitness', 'coaching', 'coaching-server']) {
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
const { isProgram, memberStats } = await import(
  pathToFileURL(`${temp}/coaching.mjs`).href
);
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
