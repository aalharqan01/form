import type { ChatGPTUser } from '../app/chatgpt-auth';
import { videoRange } from './video-server';
import { MEDIA_LIMITS, type MediaKind } from './coaching';

// Images and short videos shared between one coach and one trainee: message
// attachments and progress photos. Objects live under coaching-media/<id> and
// every access is checked against the membership recorded at upload time.
type Membership = {
  id: string;
  coach_id: string;
  trainee_id: string;
  status: string;
};
const KINDS: Record<string, MediaKind> = {
  'image/jpeg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'video/mp4': 'video',
  'video/webm': 'video',
  'video/quicktime': 'video',
};
export function mediaKind(contentType: string): MediaKind | null {
  return KINDS[contentType] ?? null;
}
export function validMediaHeader(contentType: string, bytes: Uint8Array) {
  if (bytes.length < 12) return false;
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...bytes.slice(from, to));
  switch (contentType) {
    case 'image/jpeg':
      return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case 'image/png':
      return (
        bytes[0] === 0x89 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x4e &&
        bytes[3] === 0x47
      );
    case 'image/webp':
      return ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP';
    case 'video/mp4':
    case 'video/quicktime':
      return ascii(4, 8) === 'ftyp';
    case 'video/webm':
      return [0x1a, 0x45, 0xdf, 0xa3].every((v, i) => bytes[i] === v);
    default:
      return false;
  }
}
// Workers provide FixedLengthStream so R2 knows the object size up front;
// elsewhere (tests) a counting TransformStream enforces the declared length.
function lengthStream(size: number) {
  if (typeof FixedLengthStream !== 'undefined')
    return new FixedLengthStream(size);
  let seen = 0;
  return new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      seen += chunk.length;
      if (seen > size) throw new Error('Upload exceeded its declared size.');
      controller.enqueue(chunk);
    },
    flush() {
      if (seen !== size) throw new Error('Upload was shorter than declared.');
    },
  });
}
export async function handleMedia(
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
  if (!user) return fail('Sign in to share photos and videos.', 401);
  if (!bucket)
    return fail('Media storage is unavailable. Please retry shortly.', 503);
  const url = new URL(request.url);
  const member = (id: string) =>
    db
      .prepare(
        'SELECT id, coach_id, trainee_id, status FROM coaching_memberships WHERE id=?',
      )
      .bind(id)
      .first<Membership>();
  // Both participants share while the membership is active; the coach keeps
  // read access to earlier uploads after it ends, like demonstration videos.
  const canRead = (m: Membership | null) =>
    !!m &&
    (m.coach_id === user.userId ||
      (m.trainee_id === user.userId && m.status === 'active'));
  const canWrite = (m: Membership | null) =>
    !!m &&
    m.status === 'active' &&
    (m.coach_id === user.userId || m.trainee_id === user.userId);
  if (request.method === 'POST') {
    if (
      request.headers.get('origin') &&
      request.headers.get('origin') !== url.origin
    )
      return fail('Request origin is not allowed.', 403);
    const m = await member(url.searchParams.get('member') ?? '');
    if (!canWrite(m))
      return fail('Only the coach and client of an active membership can share media.', 403);
    const mime = request.headers.get('content-type') ?? '';
    const kind = mediaKind(mime);
    if (!kind)
      return fail('Choose a JPEG, PNG or WebP photo, or an MP4, WebM or MOV video.', 415);
    const size = Number(request.headers.get('x-media-size'));
    const limit = MEDIA_LIMITS[kind];
    if (!Number.isSafeInteger(size) || size < 12 || size > limit)
      return fail(
        kind === 'image'
          ? 'Choose a photo up to 12 MB.'
          : 'Choose a video up to 25 MB.',
        413,
      );
    if (!request.body) return fail('Choose a file.', 400);
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
    if (!validMediaHeader(mime, bytes)) {
      await reader.cancel();
      return fail('This file is not a supported photo or video.', 415);
    }
    const id = crypto.randomUUID(),
      key = 'coaching-media/' + id;
    const stream = lengthStream(size);
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
          customMetadata: { membershipId: m!.id, owner: user.userId, kind },
        }),
      ]);
      const now = new Date().toISOString();
      await db
        .prepare(
          'INSERT INTO coaching_media (id,membership_id,owner_id,kind,content_type,size,created_at) VALUES (?,?,?,?,?,?,?)',
        )
        .bind(id, m!.id, user.userId, kind, mime, size, now)
        .run();
      return Response.json(
        { id, kind, contentType: mime, size },
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
  if (!/^[a-f0-9-]{36}$/.test(id)) return fail('File not found.', 404);
  const key = 'coaching-media/' + id;
  const meta = await bucket.head(key);
  if (!meta) return fail('File not found.', 404);
  const m = await member(meta.customMetadata?.membershipId ?? '');
  if (!canRead(m)) return fail('This file is not available to you.', 403);
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
    'Cache-Control': 'private, max-age=3600',
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
  if (request.method !== 'HEAD' && !body) return fail('File not found.', 404);
  return new Response(body && 'body' in body ? body.body : null, {
    status: range ? 206 : 200,
    headers,
  });
}
