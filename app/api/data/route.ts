import { getChatGPTUser } from '@/app/chatgpt-auth';
import { database } from '@/db/store';
import { EMPTY, validateData } from '@/lib/fitness';
export const dynamic = 'force-dynamic';
const reply = (value: unknown, status = 200) =>
  Response.json(value, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return reply({ error: 'Sign in to save your progress.' }, 401);
  try {
    const row = await database()
      .prepare('SELECT data, revision FROM fitness_accounts WHERE user_id = ?')
      .bind(user.userId)
      .first<{ data: string; revision: number }>();
    return reply({
      data: row ? JSON.parse(row.data) : EMPTY,
      revision: row?.revision ?? 0,
      name: user.fullName?.split(' ')[0] ?? 'Your',
      userKey: user.userId,
    });
  } catch {
    return reply(
      { error: 'Your data could not be loaded. Please retry.' },
      503,
    );
  }
}
export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user)
    return reply({ error: 'Your session has expired. Sign in again.' }, 401);
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin)
    return reply({ error: 'Request origin is not allowed.' }, 403);
  try {
    const body = await request.text();
    if (body.length > 4000000)
      return reply(
        { error: 'Your log is too large to save. Export a backup.' },
        413,
      );
    const { data, revision } = JSON.parse(body);
    if (!validateData(data) || !Number.isInteger(revision) || revision < 0)
      return reply(
        { error: 'Some entries are invalid. Check your values.' },
        400,
      );
    const db = database();
    const results = await db.batch([
      db
        .prepare(
          'INSERT OR IGNORE INTO fitness_accounts (user_id, data, revision, updated_at) VALUES (?, ?, 0, ?)',
        )
        .bind(user.userId, JSON.stringify(EMPTY), new Date().toISOString()),
      db
        .prepare(
          'UPDATE fitness_accounts SET data = ?, revision = revision + 1, updated_at = ? WHERE user_id = ? AND revision = ?',
        )
        .bind(
          JSON.stringify(data),
          new Date().toISOString(),
          user.userId,
          revision,
        ),
    ]);
    if (!results[1].meta.changes)
      return reply(
        {
          error:
            'This log changed on another device. Export your unsaved changes, then reload to get the latest version.',
        },
        409,
      );
    return reply({ revision: revision + 1 });
  } catch {
    return reply(
      { error: 'Your changes have not saved. Keep this page open and retry.' },
      503,
    );
  }
}
