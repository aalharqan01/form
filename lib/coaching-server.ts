import type { ChatGPTUser } from '../app/chatgpt-auth';
import type { Member, CoachProfile, Offer, Program, Intake } from './coaching';
import {
  isProfile,
  isTemplateRoutine,
  isNutrition,
  isProgram,
  isIntake,
  OCCUPYING_STATUSES,
  isPhotoView,
  photoViewLabel,
  text,
  memberStats,
  weekOf,
  type MediaKind,
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
  nutrition: string;
  revision: number;
  coach_read_at: string;
  trainee_read_at: string;
  created_at: string;
  accepted_at: string | null;
  ended_at: string | null;
  decided_at: string | null;
  decision_note: string;
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
    nutrition: JSON.parse(r.nutrition ?? 'null'),
    revision: r.revision,
    created_at: r.created_at,
    accepted_at: r.accepted_at,
    ended_at: r.ended_at,
    decided_at: r.decided_at,
    decision_note: r.decision_note,
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
      if (!['requested', 'awaiting_payment'].includes(r.status))
        m.intake = {} as Intake;
      m.program = null;
      m.nutrition = null;
      return { m, fitness: null };
    };
    if (request.method === 'GET') {
      if (url.searchParams.has('templates')) {
        ensure(
          await profile(),
          'Set up a coach profile to use templates.',
          403,
        );
        const rows = await db
          .prepare(
            'SELECT id,routine,revision,updated_at FROM coach_workout_templates WHERE coach_id=? ORDER BY updated_at DESC, id',
          )
          .bind(user.userId)
          .all<{
            id: string;
            routine: string;
            revision: number;
            updated_at: string;
          }>();
        return json({
          templates: rows.results.map((row) => ({
            id: row.id,
            routine: JSON.parse(row.routine),
            revision: row.revision,
            updatedAt: row.updated_at,
          })),
        });
      }
      if (url.searchParams.has('notifications')) {
        const n = await db
          .prepare(
            "SELECT SUM(CASE WHEN coach_id=? AND status='requested' THEN 1 ELSE 0 END) AS reviews, SUM(CASE WHEN trainee_id=? AND status='awaiting_payment' THEN 1 ELSE 0 END) AS payments FROM coaching_memberships WHERE coach_id=? OR trainee_id=?",
          )
          .bind(user.userId, user.userId, user.userId, user.userId)
          .first<{ reviews: number | null; payments: number | null }>();
        return json({ reviews: n?.reviews ?? 0, payments: n?.payments ?? 0 });
      }
      if (url.searchParams.has('invite'))
        throw new RequestError(
          'Invitations have been replaced by the Marketplace.',
          410,
        );
      if (url.searchParams.has('marketplace')) {
        const [rows, taken] = await Promise.all([
          db
            .prepare(
              'SELECT user_id,profile,revision FROM coach_profiles ORDER BY updated_at DESC',
            )
            .all<{ user_id: string; profile: string; revision: number }>(),
          db
            .prepare(
              `SELECT coach_id, json_extract(offer,'$.id') AS offer_id, COUNT(*) AS n FROM coaching_memberships WHERE status IN (${OCCUPYING_STATUSES.map(() => '?').join(',')}) GROUP BY coach_id, offer_id`,
            )
            .bind(...OCCUPYING_STATUSES)
            .all<{ coach_id: string; offer_id: string; n: number }>(),
        ]);
        const occupied = new Map(
          taken.results.map((t) => [`${t.coach_id}\n${t.offer_id}`, t.n]),
        );
        return json({
          coaches: rows.results.flatMap((r) => {
            const p = JSON.parse(r.profile) as CoachProfile;
            return p.listed && p.offers.length
              ? [
                  {
                    coachId: r.user_id,
                    revision: r.revision,
                    name: p.name,
                    bio: p.bio,
                    country: p.country,
                    specialties: p.specialties,
                    offers: p.offers.map((o) => ({
                      ...o,
                      spotsLeft:
                        o.capacity === undefined
                          ? null
                          : Math.max(
                              0,
                              o.capacity -
                                (occupied.get(`${r.user_id}\n${o.id}`) ?? 0),
                            ),
                    })),
                  },
                ]
              : [];
          }),
        });
      }
      const id = url.searchParams.get('member');
      if (id) {
        const r = await member(id),
          { m, fitness } = await enrich(r, true);
        if (r.status !== 'active')
          return json({
            member: m,
            fitness: null,
            messages: [],
            checkins: [],
            photos: [],
          });
        type MediaRow = {
          media_id: string | null;
          media_kind: MediaKind | null;
          media_type: string | null;
        };
        const mediaOf = (row: MediaRow) =>
          row.media_id && row.media_kind && row.media_type
            ? {
                id: row.media_id,
                kind: row.media_kind,
                contentType: row.media_type,
              }
            : null;
        const [messages, checkins, photos] = await Promise.all([
          db
            .prepare(
              'SELECT x.id,x.sender_id,x.body,x.created_at,x.media_id,md.kind AS media_kind,md.content_type AS media_type FROM (SELECT * FROM coaching_messages WHERE membership_id=? ORDER BY created_at DESC LIMIT 200) x LEFT JOIN coaching_media md ON md.id=x.media_id ORDER BY x.created_at',
            )
            .bind(r.id)
            .all<
              {
                id: string;
                sender_id: string;
                body: string;
                created_at: string;
              } & MediaRow
            >(),
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
          db
            .prepare(
              'SELECT p.id,p.owner_id,p.view,p.taken_on,p.note,p.created_at,p.media_id,md.kind AS media_kind,md.content_type AS media_type FROM progress_photos p JOIN coaching_media md ON md.id=p.media_id WHERE p.membership_id=? ORDER BY p.taken_on DESC, p.created_at DESC LIMIT 300',
            )
            .bind(r.id)
            .all<
              {
                id: string;
                owner_id: string;
                view: string;
                taken_on: string;
                note: string;
                created_at: string;
              } & MediaRow
            >(),
        ]);
        return json({
          member: m,
          fitness,
          messages: messages.results.map(
            ({ media_id, media_kind, media_type, ...msg }) => ({
              ...msg,
              media: mediaOf({ media_id, media_kind, media_type }),
            }),
          ),
          checkins: checkins.results.map((c) => ({
            ...c,
            answers: JSON.parse(c.answers),
          })),
          photos: photos.results.map(
            ({ media_id, media_kind, media_type, ...photo }) => ({
              ...photo,
              media: mediaOf({ media_id, media_kind, media_type }),
            }),
          ),
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
            'Payment setup pending. Accepted requests cannot start memberships until payment is verified.',
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
    if (b.action === 'template-save') {
      ensure(await profile(), 'Only coaches can save workout templates.', 403);
      ensure(
        isTemplateRoutine(b.routine),
        'Check the template name and exercises. Attach uploaded videos separately in each client program.',
      );
      if (b.id !== undefined) {
        ensure(
          text(b.id, 100) && Number.isInteger(b.revision),
          'Reload your templates.',
          409,
        );
        const result = await db
          .prepare(
            'UPDATE coach_workout_templates SET routine=?,revision=revision+1,updated_at=? WHERE id=? AND coach_id=? AND revision=?',
          )
          .bind(JSON.stringify(b.routine), now, b.id, user.userId, b.revision)
          .run();
        ensure(
          result.meta.changes,
          'Template changed or is unavailable. Close the editor and reload before saving.',
          409,
        );
        return json({ ok: true, id: b.id });
      }
      const templateId = crypto.randomUUID();
      await db
        .prepare(
          'INSERT INTO coach_workout_templates (id,coach_id,routine,revision,updated_at) VALUES (?,?,?,1,?)',
        )
        .bind(templateId, user.userId, JSON.stringify(b.routine), now)
        .run();
      return json({ ok: true, id: templateId });
    }
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
    if (b.action === 'invite' || b.action === 'accept')
      throw new RequestError(
        'Invitations have been replaced by Marketplace requests.',
        410,
      );
    if (b.action === 'request') {
      ensure(
        text(b.coachId, 200) && b.coachId !== user.userId,
        'Choose another coach.',
      );
      ensure(text(b.name, 100), 'Enter your name.');
      ensure(
        b.consent === true && isIntake(b.intake),
        'Complete the intake and agree to share it with this coach.',
      );
      const p = await profile(b.coachId);
      ensure(p, 'Coach not found.', 404);
      const coach = JSON.parse(p.profile) as CoachProfile;
      ensure(
        coach.listed === true,
        'This coach is not accepting marketplace requests.',
        409,
      );
      ensure(
        p.revision === b.profileRevision,
        'This coach’s offering changed. Refresh the Marketplace before requesting.',
        409,
      );
      const offer = coach.offers.find((o) => o.id === b.offerId);
      ensure(offer && offer.price > 0, 'Choose an available paid package.');
      if (offer.capacity !== undefined) {
        const taken = await db
          .prepare(
            `SELECT COUNT(*) AS n FROM coaching_memberships WHERE coach_id=? AND json_extract(offer,'$.id')=? AND status IN (${OCCUPYING_STATUSES.map(() => '?').join(',')})`,
          )
          .bind(b.coachId, offer.id, ...OCCUPYING_STATUSES)
          .first<{ n: number }>();
        ensure(
          (taken?.n ?? 0) < offer.capacity,
          'This package is full. Choose another package or coach.',
          409,
        );
      }
      const existing = await db
        .prepare(
          "SELECT id FROM coaching_memberships WHERE coach_id=? AND trainee_id=? AND status IN ('requested','awaiting_payment','active')",
        )
        .bind(b.coachId, user.userId)
        .first();
      ensure(
        !existing,
        'You already have an open request or membership with this coach.',
        409,
      );
      const id = crypto.randomUUID();
      const result = await db
        .prepare(
          "INSERT OR IGNORE INTO coaching_memberships (id,coach_id,trainee_id,email,name,status,token_hash,expires_at,offer,intake,created_at,open_key) VALUES (?,?,?,?,?,'requested',?,?,?,?,?,?)",
        )
        .bind(
          id,
          b.coachId,
          user.userId,
          user.email,
          b.name,
          'marketplace:' + id,
          now,
          JSON.stringify(offer),
          JSON.stringify(b.intake),
          now,
          JSON.stringify([b.coachId, user.userId]),
        )
        .run();
      ensure(
        result.meta.changes,
        'A request is already open. Refresh your requests.',
        409,
      );
      return json({ id });
    }
    const r = await member(b.memberId);
    const isCoach = r.coach_id === user.userId;
    if (b.action === 'decision') {
      ensure(isCoach, 'Only this coach can decide the request.', 403);
      ensure(
        b.decision === 'accept' || b.decision === 'reject',
        'Choose accept or decline.',
      );
      ensure(
        text(b.note ?? '', 1000, false),
        'Keep your note under 1,000 characters.',
      );
      const status = b.decision === 'accept' ? 'awaiting_payment' : 'rejected';
      const result = await db
        .prepare(
          "UPDATE coaching_memberships SET status=?,decided_at=?,decision_note=?,open_key=CASE WHEN ?='rejected' THEN NULL ELSE open_key END,revision=revision+1 WHERE id=? AND status='requested'",
        )
        .bind(status, now, b.note ?? '', status, r.id)
        .run();
      ensure(
        result.meta.changes,
        'This request has already changed. Refresh it.',
        409,
      );
      return json({ ok: true });
    }
    if (b.action === 'withdraw') {
      ensure(!isCoach, 'Only the trainee can withdraw a request.', 403);
      const result = await db
        .prepare(
          "UPDATE coaching_memberships SET status='withdrawn',ended_at=?,open_key=NULL,revision=revision+1 WHERE id=? AND status IN ('requested','awaiting_payment')",
        )
        .bind(now, r.id)
        .run();
      ensure(result.meta.changes, 'This request cannot be withdrawn.', 409);
      return json({ ok: true });
    }
    if (b.action === 'checkout') {
      ensure(!isCoach, 'Only the trainee can pay for this membership.', 403);
      ensure(
        r.status === 'awaiting_payment',
        'The coach must accept this request before payment.',
        409,
      );
      throw new RequestError(
        'Payment setup is not complete. Your request is accepted, but your membership will start only after a verified payment. No charge has been made.',
        503,
      );
    }
    if (b.action === 'end') {
      ensure(
        r.status === 'active' || r.status === 'invited',
        'Only an active membership can be ended.',
        409,
      );
      await db
        .prepare(
          "UPDATE coaching_memberships SET status='ended',ended_at=?,open_key=NULL,revision=revision+1 WHERE id=? AND status IN ('active','invited')",
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
    if (b.action === 'nutrition') {
      ensure(isCoach, 'Only the coach can set nutrition targets.', 403);
      ensure(
        b.nutrition === null || isNutrition(b.nutrition),
        'Check the calorie and macro targets.',
      );
      ensure(Number.isInteger(b.revision), 'Reload this client.', 409);
      const result = await db
        .prepare(
          "UPDATE coaching_memberships SET nutrition=?,revision=revision+1 WHERE id=? AND status='active' AND revision=?",
        )
        .bind(JSON.stringify(b.nutrition), r.id, b.revision)
        .run();
      ensure(
        result.meta.changes,
        'Targets changed elsewhere. Reload before saving.',
        409,
      );
      return json({ ok: true });
    }
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
    // Media may only be attached by the person who uploaded it, inside the
    // same membership, so a stolen identifier cannot expose another client.
    const ownMedia = async (mediaId: unknown, kind?: MediaKind) => {
      ensure(text(mediaId, 100), 'Choose a photo or video to attach.');
      const media = await db
        .prepare(
          'SELECT id, kind FROM coaching_media WHERE id=? AND membership_id=? AND owner_id=?',
        )
        .bind(mediaId, r.id, user.userId)
        .first<{ id: string; kind: MediaKind }>();
      ensure(
        media,
        'That upload is no longer available. Please attach it again.',
        404,
      );
      ensure(!kind || media.kind === kind, 'Choose a photo for this view.');
      return media;
    };
    if (b.action === 'message') {
      const body = typeof b.body === 'string' ? b.body.trim() : '';
      const media = b.mediaId ? await ownMedia(b.mediaId) : null;
      ensure(
        text(body, 4000, false) && (body || media),
        'Write a message of up to 4,000 characters, or attach a photo or video.',
      );
      ensure(text(b.id, 100), 'Missing message identifier.');
      await db
        .prepare(
          "INSERT OR IGNORE INTO coaching_messages (id,membership_id,sender_id,body,created_at,media_id) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM coaching_memberships WHERE id=? AND status='active')",
        )
        .bind(b.id, r.id, user.userId, body, now, media?.id ?? null, r.id)
        .run();
      return json({ ok: true });
    }
    if (b.action === 'photo') {
      ensure(text(b.id, 100), 'Missing photo identifier.');
      ensure(isPhotoView(b.view), 'Choose front, side or back view.');
      ensure(
        typeof b.takenOn === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(b.takenOn) &&
          Number.isFinite(Date.parse(b.takenOn)) &&
          b.takenOn <= now.slice(0, 10),
        'Choose the date the photo was taken, up to today.',
      );
      ensure(text(b.note, 500, false), 'Keep the note under 500 characters.');
      const media = await ownMedia(b.mediaId, 'image');
      const note = typeof b.note === 'string' ? b.note.trim() : '';
      await db.batch([
        db
          .prepare(
            "INSERT OR IGNORE INTO progress_photos (id,membership_id,owner_id,media_id,view,taken_on,note,created_at) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM coaching_memberships WHERE id=? AND status='active')",
          )
          .bind(
            b.id,
            r.id,
            user.userId,
            media.id,
            b.view,
            b.takenOn,
            note,
            now,
            r.id,
          ),
        db
          .prepare(
            "INSERT OR IGNORE INTO coaching_messages (id,membership_id,sender_id,body,created_at,media_id) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM coaching_memberships WHERE id=? AND status='active')",
          )
          .bind(
            `${b.id}-photo`,
            r.id,
            user.userId,
            `Progress photo · ${photoViewLabel(b.view)} view${note ? ' · ' + note : ''}`,
            now,
            media.id,
            r.id,
          ),
      ]);
      return json({ ok: true });
    }
    if (b.action === 'photo-delete') {
      ensure(text(b.id, 100), 'Choose a photo to remove.');
      const result = await db
        .prepare(
          'DELETE FROM progress_photos WHERE id=? AND membership_id=? AND owner_id=?',
        )
        .bind(b.id, r.id, user.userId)
        .run();
      ensure(
        result.meta.changes,
        'Only the person who added a photo can remove it.',
        403,
      );
      await db
        .prepare('DELETE FROM coaching_messages WHERE id=? AND membership_id=?')
        .bind(`${b.id}-photo`, r.id)
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
