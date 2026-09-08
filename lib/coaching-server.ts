import type { ChatGPTUser } from '../app/chatgpt-auth';
import type { Member, CoachProfile, Offer, Program, Intake } from './coaching';
import {
  isProfile,
  isProgram,
  isIntake,
  text,
  memberStats,
  weekOf,
} from './coaching';
import { EMPTY, type FitnessData } from './fitness';

type Row = {
  id: string;
  coach_id: string;
  trainee_id: string | null;
  email: string;
  name: string;
  status: Member['status'];
  token_hash: string;
  expires_at: string;
  offer: string;
  intake: string;
  program: string;
  revision: number;
  coach_read_at: string;
  trainee_read_at: string;
  created_at: string;
  accepted_at: string | null;
  ended_at: string | null;
};
class RequestError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
function ensure(
  condition: unknown,
  message: string,
  status = 400,
): asserts condition {
  if (!condition) throw new RequestError(message, status);
}
const json = (data: unknown, status = 200) =>
  Response.json(data, {
    status,
    headers: {
      'Cache-Control': 'private, no-store',
      'Referrer-Policy': 'no-referrer',
    },
  });
async function hash(token: string) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)),
    ),
  ]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('');
}
function publicMember(r: Row, coachName = ''): Member {
  return {
    id: r.id,
    coach_id: r.coach_id,
    trainee_id: r.trainee_id,
    email: r.email,
    name: r.name,
    status: r.status,
    expires_at: r.expires_at,
    offer: JSON.parse(r.offer) as Offer,
    intake: JSON.parse(r.intake) as Intake,
    program: JSON.parse(r.program) as Program | null,
    revision: r.revision,
    created_at: r.created_at,
    accepted_at: r.accepted_at,
    ended_at: r.ended_at,
    coachName,
    unread: 0,
    pending: 0,
  };
}
export async function handleCoaching(
  db: D1Database,
  user: ChatGPTUser | null,
  request: Request,
) {
  try {
    ensure(user, 'Sign in to use coaching.', 401);
    const url = new URL(request.url),
      now = new Date().toISOString();
    if (request.method !== 'GET') {
      const origin = request.headers.get('origin');
      ensure(
        !origin || origin === url.origin,
        'Request origin is not allowed.',
        403,
      );
    }
    const profile = async (uid = user.userId) =>
      await db
        .prepare('SELECT profile, revision FROM coach_profiles WHERE user_id=?')
        .bind(uid)
        .first<{ profile: string; revision: number }>();
    const member = async (id: unknown) => {
      ensure(text(id, 100), 'Choose a client.');
      const r = await db
        .prepare(
          'SELECT * FROM coaching_memberships WHERE id=? AND (coach_id=? OR trainee_id=?)',
        )
        .bind(id, user.userId, user.userId)
        .first<Row>();
      ensure(r, 'This coaching relationship is unavailable.', 404);
      return r;
    };
    const enrich = async (r: Row, details = false) => {
      const p = await profile(r.coach_id),
        m = publicMember(r, p ? JSON.parse(p.profile).name : 'Coach');
      if (r.status === 'active') {
        const [f, unread, pending] = await Promise.all([
          db
            .prepare('SELECT data FROM fitness_accounts WHERE user_id=?')
            .bind(r.trainee_id)
            .first<{ data: string }>(),
          db
            .prepare(
              'SELECT COUNT(*) AS n FROM coaching_messages WHERE membership_id=? AND sender_id<>? AND created_at>?',
            )
            .bind(
              r.id,
              user.userId,
              r.coach_id === user.userId ? r.coach_read_at : r.trainee_read_at,
            )
            .first<{ n: number }>(),
          db
            .prepare(
              'SELECT COUNT(*) AS n FROM coaching_checkins WHERE membership_id=? AND reviewed_at IS NULL',
            )
            .bind(r.id)
            .first<{ n: number }>(),
        ]);
        const fitness = f ? (JSON.parse(f.data) as FitnessData) : EMPTY;
        m.unread = unread?.n ?? 0;
        m.pending = pending?.n ?? 0;
        m.stats = memberStats(fitness, m);
        return { m, fitness: details ? fitness : null };
      }
      // Ending coaching immediately removes access to shared health data.
      m.intake = {} as Intake;
      m.program = null;
      return { m, fitness: null };
    };
    if (request.method === 'GET') {
      const token = url.searchParams.get('invite');
      if (token) {
        ensure(/^[a-f0-9]{64}$/.test(token), 'Invalid invitation.', 404);
        const r = await db
          .prepare('SELECT * FROM coaching_memberships WHERE token_hash=?')
          .bind(await hash(token))
          .first<Row>();
        ensure(
          r && r.status === 'invited' && r.expires_at > now,
          'This invitation has expired or has already been used.',
          410,
        );
        ensure(
          r.email === user.email.toLowerCase(),
          'Sign in with the email address your coach invited.',
          403,
        );
        const p = await profile(r.coach_id);
        ensure(p, 'This coach is unavailable.', 404);
        const coach = JSON.parse(p.profile) as CoachProfile;
        return json({
          coach: {
            name: coach.name,
            bio: coach.bio,
            specialties: coach.specialties,
            country: coach.country,
          },
          offer: JSON.parse(r.offer),
          name: r.name,
          expiresAt: r.expires_at,
        });
      }
      const id = url.searchParams.get('member');
      if (id) {
        const r = await member(id),
          { m, fitness } = await enrich(r, true);
        if (r.status !== 'active')
          return json({ member: m, fitness: null, messages: [], checkins: [] });
        const [messages, checkins] = await Promise.all([
          db
            .prepare(
              'SELECT id,sender_id,body,created_at FROM (SELECT * FROM coaching_messages WHERE membership_id=? ORDER BY created_at DESC LIMIT 200) ORDER BY created_at',
            )
            .bind(r.id)
            .all(),
          db
            .prepare(
              'SELECT id,week,answers,feedback,created_at,reviewed_at FROM coaching_checkins WHERE membership_id=? ORDER BY week DESC LIMIT 104',
            )
            .bind(r.id)
            .all<{
              id: string;
              week: string;
              answers: string;
              feedback: string;
              created_at: string;
              reviewed_at: string | null;
            }>(),
        ]);
        return json({
          member: m,
          fitness,
          messages: messages.results,
          checkins: checkins.results.map((c) => ({
            ...c,
            answers: JSON.parse(c.answers),
          })),
        });
      }
      const [p, rows] = await Promise.all([
        profile(),
        db
          .prepare(
            'SELECT * FROM coaching_memberships WHERE coach_id=? OR trainee_id=? ORDER BY created_at DESC LIMIT 300',
          )
          .bind(user.userId, user.userId)
          .all<Row>(),
      ]);
      const members = await Promise.all(
        rows.results.map(async (r) => (await enrich(r)).m),
      );
      return json({
        userId: user.userId,
        profile: p ? JSON.parse(p.profile) : null,
        profileRevision: p?.revision ?? 0,
        clients: members.filter((r) => r.coach_id === user.userId),
        memberships: members.filter((r) => r.trainee_id === user.userId),
        billing: {
          enabled: false,
          message:
            'Unpaid pilot. Checkout, automatic renewals and payouts are not enabled.',
        },
      });
    }
    ensure(request.method === 'POST', 'Method not allowed.', 405);
    const raw = await request.text();
    ensure(raw.length <= 150000, 'This update is too large.', 413);
    let b: Record<string, unknown>;
    try {
      b = JSON.parse(raw);
    } catch {
      throw new RequestError('Invalid request.');
    }
    ensure(b && typeof b === 'object', 'Invalid request.');
    if (b.action === 'profile') {
      ensure(isProfile(b.profile), 'Check your coach profile and packages.');
      ensure(Number.isInteger(b.revision), 'Reload your profile.', 409);
      const results = await db.batch([
        db
          .prepare(
            'INSERT OR IGNORE INTO coach_profiles (user_id,profile,revision,updated_at) VALUES (?,?,0,?)',
          )
          .bind(user.userId, JSON.stringify(b.profile), now),
        db
          .prepare(
            'UPDATE coach_profiles SET profile=?,revision=revision+1,updated_at=? WHERE user_id=? AND revision=?',
          )
          .bind(JSON.stringify(b.profile), now, user.userId, b.revision),
      ]);
      ensure(
        results[1].meta.changes,
        'Your profile changed elsewhere. Reload before saving.',
        409,
      );
      return json({ ok: true });
    }
    if (b.action === 'invite') {
      const p = await profile();
      ensure(p, 'Set up your coach profile first.', 403);
      ensure(
        text(b.email, 254) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email),
        'Enter a valid client email.',
      );
      ensure(text(b.name, 100), 'Enter the client’s name.');
      const email = b.email.toLowerCase().trim();
      ensure(
        email !== user.email.toLowerCase(),
        'Invite a client using a different account.',
      );
      const offer = (JSON.parse(p.profile) as CoachProfile).offers.find(
        (o) => o.id === b.offerId,
      );
      ensure(offer, 'Choose a saved package.');
      const existing = await db
        .prepare(
          "SELECT id FROM coaching_memberships WHERE coach_id=? AND email=? AND status<>'ended' AND (status='active' OR expires_at>?)",
        )
        .bind(user.userId, email, now)
        .first();
      ensure(
        !existing,
        'This client already has an active membership or invitation.',
        409,
      );
      const token = [...crypto.getRandomValues(new Uint8Array(32))]
          .map((n) => n.toString(16).padStart(2, '0'))
          .join(''),
        id = crypto.randomUUID();
      const expires = new Date(Date.now() + 14 * 86400000).toISOString();
      await db
        .prepare(
          'INSERT INTO coaching_memberships (id,coach_id,email,name,token_hash,expires_at,offer,created_at) VALUES (?,?,?,?,?,?,?,?)',
        )
        .bind(
          id,
          user.userId,
          email,
          b.name,
          await hash(token),
          expires,
          JSON.stringify(offer),
          now,
        )
        .run();
      return json({
        id,
        invitePath: '/join?invite=' + token,
        expiresAt: expires,
      });
    }
    if (b.action === 'accept') {
      ensure(
        text(b.token, 64) && /^[a-f0-9]{64}$/.test(b.token),
        'Invalid invitation.',
      );
      ensure(
        b.consent === true,
        'Agree to share your progress before joining.',
      );
      ensure(isIntake(b.intake), 'Complete your intake form.');
      const result = await db
        .prepare(
          "UPDATE coaching_memberships SET trainee_id=?,intake=?,status='active',accepted_at=?,revision=revision+1 WHERE token_hash=? AND email=? AND coach_id<>? AND status='invited' AND expires_at>?",
        )
        .bind(
          user.userId,
          JSON.stringify(b.intake),
          now,
          await hash(b.token),
          user.email.toLowerCase(),
          user.userId,
          now,
        )
        .run();
      ensure(
        result.meta.changes,
        'This invitation is unavailable, expired, or belongs to another email.',
        409,
      );
      return json({ ok: true });
    }
    const r = await member(b.memberId);
    const isCoach = r.coach_id === user.userId;
    if (b.action === 'end') {
      ensure(r.status !== 'ended', 'This membership has already ended.', 409);
      await db
        .prepare(
          "UPDATE coaching_memberships SET status='ended',ended_at=?,revision=revision+1 WHERE id=?",
        )
        .bind(now, r.id)
        .run();
      return json({ ok: true });
    }
    ensure(
      r.status === 'active',
      'This coaching relationship is no longer active.',
      403,
    );
    if (b.action === 'program') {
      ensure(isCoach, 'Only your coach can assign a program.', 403);
      ensure(
        isProgram(b.program),
        'Check your program, sessions and exercise targets.',
      );
      ensure(Number.isInteger(b.revision), 'Reload this client.', 409);
      const result = await db
        .prepare(
          "UPDATE coaching_memberships SET program=?,revision=revision+1 WHERE id=? AND status='active' AND revision=?",
        )
        .bind(JSON.stringify(b.program), r.id, b.revision)
        .run();
      ensure(
        result.meta.changes,
        'The program changed elsewhere. Reload before saving.',
        409,
      );
      return json({ ok: true });
    }
    if (b.action === 'message') {
      ensure(text(b.body, 4000), 'Write a message of up to 4,000 characters.');
      ensure(text(b.id, 100), 'Missing message identifier.');
      await db
        .prepare(
          "INSERT OR IGNORE INTO coaching_messages (id,membership_id,sender_id,body,created_at) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM coaching_memberships WHERE id=? AND status='active')",
        )
        .bind(b.id, r.id, user.userId, b.body.trim(), now, r.id)
        .run();
      return json({ ok: true });
    }
    if (b.action === 'read') {
      // Bound to the newest message actually displayed, so a concurrent message stays unread.
      ensure(
        text(b.through, 40) &&
          Number.isFinite(Date.parse(b.through)) &&
          b.through <= now,
        'Invalid message cursor.',
      );
      const column = isCoach ? 'coach_read_at' : 'trainee_read_at';
      await db
        .prepare(
          `UPDATE coaching_memberships SET ${column}=MAX(${column},?) WHERE id=?`,
        )
        .bind(b.through, r.id)
        .run();
      return json({ ok: true });
    }
    if (b.action === 'checkin') {
      ensure(!isCoach, 'Only the trainee can submit a check-in.', 403);
      const a = b.answers as {
        energy: number;
        sleep: number;
        wins: string;
        challenges: string;
      };
      ensure(
        a &&
          Number.isInteger(a.energy) &&
          a.energy >= 1 &&
          a.energy <= 5 &&
          typeof a.sleep === 'number' &&
          a.sleep >= 0 &&
          a.sleep <= 24 &&
          text(a.wins, 2000, false) &&
          text(a.challenges, 2000, false),
        'Check your answers.',
      );
      const week = weekOf(),
        id = r.id + ':' + week;
      await db
        .prepare(
          "INSERT OR IGNORE INTO coaching_checkins (id,membership_id,week,answers,created_at) SELECT ?,?,?,?,? WHERE EXISTS (SELECT 1 FROM coaching_memberships WHERE id=? AND status='active')",
        )
        .bind(id, r.id, week, JSON.stringify(a), now, r.id)
        .run();
      return json({ ok: true });
    }
    if (b.action === 'feedback') {
      ensure(isCoach, 'Only the coach can review check-ins.', 403);
      ensure(
        text(b.checkinId, 150) && text(b.feedback, 4000),
        'Write feedback before marking reviewed.',
      );
      const result = await db
        .prepare(
          "UPDATE coaching_checkins SET feedback=?,reviewed_at=? WHERE id=? AND membership_id=? AND EXISTS (SELECT 1 FROM coaching_memberships WHERE id=? AND status='active')",
        )
        .bind(b.feedback, now, b.checkinId, r.id, r.id)
        .run();
      ensure(result.meta.changes, 'Check-in not found.', 404);
      return json({ ok: true });
    }
    if (b.action === 'checkout')
      throw new RequestError(
        'Payments are not enabled for this pilot. No charge has been made.',
        503,
      );
    throw new RequestError('Unknown coaching action.');
  } catch (e) {
    if (e instanceof RequestError) return json({ error: e.message }, e.status);
    console.error(
      'Coaching request failed',
      e instanceof Error ? e.name : 'Unknown',
    );
    return json(
      { error: 'Could not complete this request. Please retry.' },
      503,
    );
  }
}
