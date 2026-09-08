import type { ChatGPTUser } from '../app/chatgpt-auth';
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
export function videoRange(value: string | null, size: number) {
  if (!value) return null;
  const m = value.match(/^bytes=(\d*)-(\d*)$/);
  if (!m || (!m[1] && !m[2])) throw new Error('Invalid range');
  const offset = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]));
  const end = m[1]
    ? m[2]
      ? Math.min(size - 1, Number(m[2]))
      : size - 1
    : size - 1;
  if (
    !Number.isSafeInteger(offset) ||
    !Number.isSafeInteger(end) ||
    offset < 0 ||
    offset >= size ||
    end < offset ||
    (!m[1] && Number(m[2]) === 0)
  )
    throw new Error('Invalid range');
  return { offset, length: end - offset + 1 };
}
export async function handleVideo(
  db: D1Database,
  bucket: R2Bucket,
  user: ChatGPTUser | null,
  request: Request,
) {
  const fail = (error: string, status: number) =>
    Response.json(
      { error },
      { status, headers: { 'Cache-Control': 'private, no-store' } },
    );
  if (!user) return fail('Sign in to view or upload videos.', 401);
  if (!bucket)
    return fail('Video storage is unavailable. Please retry shortly.', 503);
  const url = new URL(request.url);
  type Membership = {
    id: string;
    coach_id: string;
    trainee_id: string;
    status: string;
  };
  const member = (id: string) =>
    db
      .prepare(
        'SELECT id, coach_id, trainee_id, status FROM coaching_memberships WHERE id=?',
      )
      .bind(id)
      .first<Membership>();
  if (request.method === 'POST') {
    if (
      request.headers.get('origin') &&
      request.headers.get('origin') !== url.origin
    )
      return fail('Request origin is not allowed.', 403);
    const m = await member(url.searchParams.get('member') ?? '');
    if (!m || m.coach_id !== user.userId || m.status !== 'active')
      return fail(
        'Only the client’s active coach can upload demonstrations.',
        403,
      );
    const size = Number(request.headers.get('x-video-size'));
    const mime = request.headers.get('content-type') ?? '';
    if (!['video/mp4', 'video/webm'].includes(mime))
      return fail('Choose an MP4 or WebM video.', 415);
    if (!Number.isSafeInteger(size) || size < 12 || size > MAX_VIDEO_BYTES)
      return fail('Choose a video up to 25 MB.', 413);
    if (!request.body) return fail('Choose a video file.', 400);
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let headerLength = 0;
    while (headerLength < 12) {
      const next = await reader.read();
      if (next.done) break;
      chunks.push(next.value);
      headerLength += next.value.length;
    }
    const bytes = new Uint8Array(headerLength);
    let cursor = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, cursor);
      cursor += chunk.length;
    }
    const valid =
      headerLength >= 12 &&
      (mime === 'video/mp4'
        ? String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp'
        : [0x1a, 0x45, 0xdf, 0xa3].every((v, i) => bytes[i] === v));
    if (!valid) {
      await reader.cancel();
      return fail('This file is not a supported video.', 415);
    }
    const id = crypto.randomUUID(),
      key = 'coaching-videos/' + id;
    const stream = new FixedLengthStream(size);
    const writer = stream.writable.getWriter();
    const pump = (async () => {
      try {
        await writer.write(bytes);
        while (true) {
          const next = await reader.read();
          if (next.done) break;
          await writer.write(next.value);
        }
        await writer.close();
      } catch (e) {
        await writer.abort(e).catch(() => {});
        throw e;
      } finally {
        await reader.cancel().catch(() => {});
      }
    })();
    try {
      await Promise.all([
        pump,
        bucket.put(key, stream.readable, {
          httpMetadata: { contentType: mime },
          customMetadata: { membershipId: m.id, owner: user.userId },
        }),
      ]);
      return Response.json(
        { url: '/api/videos?id=' + id },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    } catch {
      await writer.abort().catch(() => {});
      await bucket.delete(key).catch(() => {});
      return fail('Upload didn’t finish. Please retry.', 400);
    }
  }
  if (!['GET', 'HEAD'].includes(request.method))
    return fail('Method not allowed.', 405);
  const id = url.searchParams.get('id') ?? '';
  if (!/^[a-f0-9-]{36}$/.test(id)) return fail('Video not found.', 404);
  const key = 'coaching-videos/' + id;
  const meta = await bucket.head(key);
  if (!meta) return fail('Video not found.', 404);
  const m = await member(meta.customMetadata?.membershipId ?? '');
  if (
    !m ||
    (m.coach_id !== user.userId &&
      !(m.trainee_id === user.userId && m.status === 'active'))
  )
    return fail('Video is not available for this membership.', 403);
  let range;
  try {
    range = videoRange(request.headers.get('range'), meta.size);
  } catch {
    return new Response(null, {
      status: 416,
      headers: {
        'Content-Range': `bytes */${meta.size}`,
        'Cache-Control': 'private, no-store',
      },
    });
  }
  const headers = new Headers({
    'Cache-Control': 'private, no-store',
    'Accept-Ranges': 'bytes',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': 'inline',
  });
  meta.writeHttpMetadata(headers);
  headers.set('Content-Length', String(range?.length ?? meta.size));
  if (range)
    headers.set(
      'Content-Range',
      `bytes ${range.offset}-${range.offset + range.length - 1}/${meta.size}`,
    );
  const body =
    request.method === 'HEAD'
      ? null
      : await bucket.get(key, range ? { range } : undefined);
  if (request.method !== 'HEAD' && !body) return fail('Video not found.', 404);
  return new Response(body && 'body' in body ? body.body : null, {
    status: range ? 206 : 200,
    headers,
  });
}
