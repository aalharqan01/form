import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } from 'jose';
import { authenticateAccess } from '../workers/access.ts';
const env = {
  ACCESS_TEAM_DOMAIN: 'https://form-test.cloudflareaccess.com',
  ACCESS_AUD: 'test-audience',
};
const { privateKey, publicKey } = await generateKeyPair('RS256');
const keyset = createLocalJWKSet({
  keys: [{ ...(await exportJWK(publicKey)), kid: 'test', alg: 'RS256' }],
});
async function token(overrides = {}) {
  return new SignJWT({
    email: 'coach@example.test',
    name: 'That Guy',
    ...overrides,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setSubject('trusted-subject')
    .setIssuer(env.ACCESS_TEAM_DOMAIN)
    .setAudience(env.ACCESS_AUD)
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
}
test('Access rejects missing configuration and unsigned identity headers', async () => {
  const spoof = new Request('https://form.example/api/data', {
    headers: {
      'oai-authenticated-user-id': 'admin',
      'oai-authenticated-user-email': 'admin@example.test',
    },
  });
  assert.equal((await authenticateAccess(spoof, {})).status, 503);
  assert.equal((await authenticateAccess(spoof, env)).status, 401);
});
test('Access derives identity only from signed claims and removes fixture headers', async () => {
  const request = new Request('https://form.example/api/data', {
    headers: {
      'cf-access-jwt-assertion': await token(),
      'oai-authenticated-user-id': 'local-form-coach',
      'oai-authenticated-user-email': 'attacker@example.test',
      'oai-authenticated-user-full-name': 'Administrator',
      'x-form-dev-role': 'coach',
      'x-form-dev-token': 'fake',
    },
  });
  const verified = await authenticateAccess(request, env, keyset);
  assert.ok(verified instanceof Request);
  assert.equal(
    verified.headers.get('oai-authenticated-user-id'),
    'cf-access:trusted-subject',
  );
  assert.equal(
    verified.headers.get('oai-authenticated-user-email'),
    'coach@example.test',
  );
  assert.equal(
    verified.headers.get('oai-authenticated-user-full-name'),
    'That%20Guy',
  );
  assert.equal(verified.headers.get('x-form-dev-role'), null);
  assert.equal(verified.headers.get('cf-access-jwt-assertion'), null);
});
test('Access rejects wrong audience, wrong issuer, expired tokens, and service identities', async () => {
  const valid = await token();
  const make = (value) =>
    new Request('https://form.example/', {
      headers: { 'cf-access-jwt-assertion': value },
    });
  assert.equal(
    (
      await authenticateAccess(
        make(valid),
        { ...env, ACCESS_AUD: 'other' },
        keyset,
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await authenticateAccess(
        make(valid),
        { ...env, ACCESS_TEAM_DOMAIN: 'https://other.cloudflareaccess.com' },
        keyset,
      )
    ).status,
    401,
  );
  const expired = await new SignJWT({ email: 'a@example.test' })
    .setProtectedHeader({ alg: 'RS256', kid: 'test' })
    .setSubject('x')
    .setIssuer(env.ACCESS_TEAM_DOMAIN)
    .setAudience(env.ACCESS_AUD)
    .setIssuedAt(1)
    .setExpirationTime(2)
    .sign(privateKey);
  assert.equal(
    (await authenticateAccess(make(expired), env, keyset)).status,
    401,
  );
  assert.equal(
    (
      await authenticateAccess(
        make(await token({ email: undefined })),
        env,
        keyset,
      )
    ).status,
    401,
  );
  assert.equal(
    (
      await authenticateAccess(
        make(valid.slice(0, -10) + 'abcdefghij'),
        env,
        keyset,
      )
    ).status,
    401,
  );
});
