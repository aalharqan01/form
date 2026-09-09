import type { CoachingState, MemberDetail } from '../../lib/coaching';
import type { FitnessData } from '../../lib/fitness';

export type Role = 'coach' | 'client';
export type FitnessResponse = {
  data: FitnessData;
  revision: number;
  userKey: string;
  name: string;
};
export const origins = {
  coach: 'http://127.0.0.1:3100',
  client: 'http://127.0.0.1:3101',
};
export async function request<T>(
  role: Role,
  path: string,
  body?: unknown,
  method = 'POST',
): Promise<T> {
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 15000);
  try {
    const response = await fetch(origins[role] + path, {
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
export async function loadWorkspace(role: Role) {
  const state = await request<CoachingState>(role, '/api/coaching');
  const member = (role === 'coach' ? state.clients : state.memberships).find(
    (item) => item.status === 'active',
  );
  const [detail, fitness] = await Promise.all([
    member
      ? request<MemberDetail>(
          role,
          `/api/coaching?member=${encodeURIComponent(member.id)}`,
        )
      : Promise.resolve(null),
    role === 'client'
      ? request<FitnessResponse>(role, '/api/data')
      : Promise.resolve(null),
  ]);
  return { state, detail, fitness };
}
