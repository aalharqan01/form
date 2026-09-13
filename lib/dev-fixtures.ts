import type { ChatGPTUser } from '../app/chatgpt-auth';
import { COACH_NAME } from './fixtures.ts';
import { seedStatements } from './seed-sql.ts';

/**
 * Developer preview on the development site. Every signed-in developer is the
 * coach That Guy with sample clients and is also a client of that coach, plus
 * two private fixture trainees they can open the app as: one coached by their own coach profile and one without
 * a coach. The Worker maps `?role=coached|solo` to these identities; this
 * module creates their rows the first time the developer signs in.
 */
export const PREVIEW_ROLES = ['coached', 'solo'] as const;
export type PreviewRole = (typeof PREVIEW_ROLES)[number];
export const isPreviewRole = (value: unknown): value is PreviewRole =>
  PREVIEW_ROLES.includes(value as PreviewRole);
const SUFFIX = ':preview-';
export const previewUserId = (developerId: string, role: PreviewRole) =>
  `${developerId}${SUFFIX}${role}`;
export const previewEmail = (developerId: string, role: PreviewRole) =>
  `${role}.${developerId.replace(/[^a-z0-9]/gi, '')}@preview.invalid`;
export const PREVIEW_NAMES: Record<PreviewRole, string> = {
  coached: 'Abdullah Al-Harbi',
  solo: 'Sara Al-Otaibi',
};
/** The developer behind a preview identity, or the id itself. */
export function developerOf(userId: string) {
  const at = userId.indexOf(SUFFIX);
  return at === -1 ? userId : userId.slice(0, at);
}
function hash(value: string) {
  let h = 5381;
  for (const ch of value) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return h.toString(36);
}
/** Creates the developer's sample coach, clients and fixture trainees once. */
export async function ensureDeveloperFixtures(
  db: D1Database,
  user: ChatGPTUser,
) {
  const developer = developerOf(user.userId);
  const prefix = `dev-${hash(developer)}`;
  // The self-membership is the last row the seed adds; every statement is
  // idempotent, so an older partial set is completed rather than duplicated.
  const exists = await db
    .prepare('SELECT 1 AS ok FROM coaching_memberships WHERE id=?')
    .bind(`${prefix}-membership-self`)
    .first();
  if (exists) return false;
  const statements = seedStatements({
    prefix,
    coach: { id: developer, name: COACH_NAME },
    client: {
      id: previewUserId(developer, 'coached'),
      email: previewEmail(developer, 'coached'),
      name: PREVIEW_NAMES.coached,
    },
    solo: { id: previewUserId(developer, 'solo') },
    // The developer's own account is also a client of That Guy, so /app/
    // without a role shows the coached experience for whoever signs in.
    self: { id: developer, email: user.email, name: user.displayName },
    refresh: false,
  });
  await db.batch(statements.map((sql) => db.prepare(sql)));
  return true;
}
