'use client';
import { createContext, useContext } from 'react';
export type CoachingTransport = <T>(
  query?: string,
  body?: unknown,
) => Promise<T>;
export const CoachingTransportContext = createContext<CoachingTransport | null>(
  null,
);
async function network<T>(query = '', body?: unknown): Promise<T> {
  const r = await fetch('/api/coaching' + query, {
    cache: 'no-store',
    ...(body
      ? {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      : {}),
  });
  const data = (await r.json()) as T & { error?: string };
  if (!r.ok) throw new Error(data.error || 'Please retry.');
  return data;
}
export function useCoachingTransport() {
  return useContext(CoachingTransportContext) ?? network;
}
/** True when talking to the real API, where uploads and media are available. */
export function useIsNetworkTransport() {
  return useContext(CoachingTransportContext) === null;
}
