import type { CoachingState, MemberDetail } from '../../lib/coaching';
import type { FitnessData } from '../../lib/fitness';

export type FitnessResponse = {
  data: FitnessData;
  revision: number;
  userKey: string;
  name: string;
};
import { API_ORIGIN as origin, HOSTED, PREVIEW_ROLE } from './account';
const previewHeaders: Record<string, string> = PREVIEW_ROLE
  ? { 'X-Form-Preview': PREVIEW_ROLE }
  : {};
export async function request<T>(
  path: string,
  body?: unknown,
  method = 'POST',
): Promise<T> {
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 15000);
  try {
    const response = await fetch(origin + path, {
      method: body === undefined ? 'GET' : method,
      headers: {
        ...previewHeaders,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: abort.signal,
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || 'The update could not be saved.');
    return data as T;
  } catch (error) {
    if (
      error instanceof TypeError ||
      (error instanceof Error && error.name === 'AbortError')
    ) {
      throw new Error(
        HOSTED
          ? 'The server is unreachable. Check your connection and retry.'
          : 'The local backend is unavailable. Start npm run dev:roles on your Mac, then retry.',
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
export async function loadWorkspace() {
  const state = await request<CoachingState>('/api/coaching');
  const member = state.memberships.find((item) => item.status === 'active');
  const [detail, fitness] = await Promise.all([
    member
      ? request<MemberDetail>(
          `/api/coaching?member=${encodeURIComponent(member.id)}`,
        )
      : Promise.resolve(null),
    request<FitnessResponse>('/api/data'),
  ]);
  return { state, detail, fitness };
}

export type UploadedMedia = {
  id: string;
  kind: 'image' | 'video';
  contentType: string;
  size: number;
};
/** Upload a picked photo or video for one membership; the server validates it. */
export async function uploadMedia(
  memberId: string,
  uri: string,
  contentType: string,
): Promise<UploadedMedia> {
  const blob = await (await fetch(uri)).blob();
  const type = contentType || blob.type;
  const response = await fetch(
    origin + '/api/media?member=' + encodeURIComponent(memberId),
    {
      method: 'POST',
      headers: {
        ...previewHeaders,
        'Content-Type': type,
        'X-Media-Size': String(blob.size),
      },
      body: blob,
    },
  ).catch(() => {
    throw new Error('Upload failed. Check your connection and retry.');
  });
  const data = (await response.json()) as UploadedMedia & { error?: string };
  if (!response.ok)
    throw new Error(data.error || 'Upload failed. Please retry.');
  return data;
}
export const mediaUri = (id: string) =>
  origin +
  '/api/media?id=' +
  id +
  (PREVIEW_ROLE ? '&preview=' + PREVIEW_ROLE : '');
