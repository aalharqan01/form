import type { CoachingState, MemberDetail } from '../../lib/coaching';
import type { FitnessData } from '../../lib/fitness';

export type FitnessResponse = {
  data: FitnessData;
  revision: number;
  userKey: string;
  name: string;
};
import { API_ORIGIN as origin } from './account';
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
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
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
        'The local backend is unavailable. Start npm run dev:roles on your Mac, then retry.',
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
