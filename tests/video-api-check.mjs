import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
const base = process.env.FORM_TEST_ORIGIN;
assert.ok(
  base && new URL(base).hostname === 'localhost',
  'Only local test servers are allowed',
);
const dbPath = process.env.FORM_TEST_DB;
assert.ok(
  dbPath?.startsWith('.wrangler/state/v3/d1/') && dbPath.endsWith('.sqlite'),
);
const signIn = await fetch(base + '/signin-with-chatgpt?return_to=%2F', {
  redirect: 'manual',
});
const cookie = signIn.headers.get('set-cookie')?.split(';')[0];
assert.ok(cookie);
const headers = { Cookie: cookie };
const self = await (await fetch(base + '/api/coaching', { headers })).json();
assert.ok(self.userId);
const db = new DatabaseSync(dbPath),
  id = 'video-test-' + crypto.randomUUID();
db.prepare(
  "INSERT INTO coaching_memberships (id,coach_id,trainee_id,email,name,status,token_hash,expires_at,offer,intake,program,created_at) VALUES (?,?,?,?,?,'active',?,?,?,?,'null',?)",
).run(
  id,
  self.userId,
  'video-test-trainee',
  'test@example.com',
  'Video test',
  id,
  '2099-01-01',
  '{}',
  '{}',
  new Date().toISOString(),
);
try {
  const bytes = new Uint8Array(32);
  bytes.set([0, 0, 0, 32, 102, 116, 121, 112, 105, 115, 111, 109]);
  const put = await fetch(base + '/api/videos?member=' + id, {
    method: 'POST',
    headers: {
      ...headers,
      'Content-Type': 'video/mp4',
      'X-Video-Size': String(bytes.length),
    },
    body: bytes,
  });
  assert.equal(put.status, 200, await put.clone().text());
  const { url } = await put.json();
  const get = await fetch(base + url, {
    headers: { ...headers, Range: 'bytes=4-11' },
  });
  assert.equal(get.status, 206, await get.clone().text());
  assert.equal(get.headers.get('content-range'), 'bytes 4-11/32');
  assert.deepEqual(new Uint8Array(await get.arrayBuffer()), bytes.slice(4, 12));
  const head = await fetch(base + url, { method: 'HEAD', headers });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-length'), '32');
  assert.equal((await fetch(base + url)).status, 401);
  const wrong = await fetch(base + '/api/videos?member=' + id, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'video/mp4', 'X-Video-Size': '16' },
    body: bytes,
  });
  assert.equal(wrong.status, 400, await wrong.clone().text());
  for (const path of ['/', '/coaching'])
    assert.equal((await fetch(base + path, { headers })).status, 200, path);
  console.log(
    'Local video upload, byte-range playback, HEAD, size enforcement, authentication and app routes passed.',
  );
} finally {
  db.prepare('DELETE FROM coaching_memberships WHERE id=?').run(id);
  db.close();
}
