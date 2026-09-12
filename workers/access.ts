import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

export type AccessEnvironment = {
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  /** 'true' only on development deployments: allows the ?role= preview identities. */
  PREVIEW_ROLES?: string;
};
const PREVIEW_ROLES = ['coached', 'solo'] as const;
const PREVIEW_NAMES = { coached: 'Abdullah Al-Harbi', solo: 'Sara Al-Otaibi' };
/**
 * On development deployments a signed-in developer can view the app as one of
 * their own fixture trainees by sending `X-Form-Preview: coached|solo` (or
 * `?preview=` for media loaded by <img>/<video>). The identity stays derived
 * from the verified account, so nobody can reach another developer's fixtures.
 * Production never sets PREVIEW_ROLES, so the header is ignored there.
 */
export function applyPreviewRole(
  request: Request,
  env: AccessEnvironment,
): Request {
  if (env.PREVIEW_ROLES !== 'true') return request;
  const url = new URL(request.url);
  const role =
    request.headers.get('x-form-preview') ?? url.searchParams.get('preview');
  if (!role || !(PREVIEW_ROLES as readonly string[]).includes(role))
    return request;
  const developer = request.headers.get('oai-authenticated-user-id');
  if (!developer) return request;
  const headers = new Headers(request.headers);
  headers.set('oai-authenticated-user-id', `${developer}:preview-${role}`);
  headers.set(
    'oai-authenticated-user-email',
    `${role}.${developer.replace(/[^a-z0-9]/gi, '')}@preview.invalid`,
  );
  headers.set(
    'oai-authenticated-user-full-name',
    encodeURIComponent(PREVIEW_NAMES[role as keyof typeof PREVIEW_NAMES]),
  );
  headers.set(
    'oai-authenticated-user-full-name-encoding',
    'percent-encoded-utf-8',
  );
  return new Request(request, { headers });
}
const keysets = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

export async function authenticateAccess(
  request: Request,
  env: AccessEnvironment,
  testKey?: JWTVerifyGetKey,
): Promise<Request | Response> {
  const issuer = env.ACCESS_TEAM_DOMAIN;
  const audience = env.ACCESS_AUD;
  if (
    !issuer ||
    !/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer) ||
    !audience
  ) {
    return new Response('Access authentication is not configured.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }
  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token)
    return new Response(
      'Sign in through the protected Cloudflare Access URL.',
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  try {
    let key = testKey ?? keysets.get(issuer);
    if (!key) {
      const remote = createRemoteJWKSet(
        new URL(`${issuer}/cdn-cgi/access/certs`),
      );
      keysets.set(issuer, remote);
      key = remote;
    }
    const { payload } = await jwtVerify(token, key, {
      issuer,
      audience,
      algorithms: ['RS256'],
      requiredClaims: ['sub', 'email', 'exp', 'iat'],
    });
    if (
      typeof payload.sub !== 'string' ||
      !payload.sub ||
      typeof payload.email !== 'string' ||
      !payload.email.includes('@')
    )
      throw new Error('A user identity is required.');
    const headers = new Headers(request.headers);
    const originalNames = [...headers.keys()];
    for (const name of originalNames) {
      if (
        name.startsWith('oai-authenticated-user-') ||
        name.startsWith('x-form-dev-')
      )
        headers.delete(name);
    }
    headers.delete('cf-access-jwt-assertion');
    headers.set('oai-authenticated-user-id', `cf-access:${payload.sub}`);
    headers.set('oai-authenticated-user-email', payload.email);
    if (typeof payload.name === 'string' && payload.name) {
      headers.set(
        'oai-authenticated-user-full-name',
        encodeURIComponent(payload.name),
      );
      headers.set(
        'oai-authenticated-user-full-name-encoding',
        'percent-encoded-utf-8',
      );
    }
    return new Request(request, { headers });
  } catch {
    return new Response(
      'Your session is invalid or expired. Sign in again through Cloudflare Access.',
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
