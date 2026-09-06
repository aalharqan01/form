'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { EMPTY, type FitnessData } from '@/lib/fitness';
export function useFitness() {
  const [data, setData] = useState<FitnessData>(EMPTY),
    [loaded, setLoaded] = useState(false),
    [name, setName] = useState('Your'),
    [status, setStatus] = useState('Loading your log…'),
    [error, setError] = useState('');
  const current = useRef(data),
    revision = useRef(0),
    dirty = useRef(false),
    busy = useRef(false),
    failed = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/data', { cache: 'no-store' });
      const value = (await response.json()) as {
        data: FitnessData;
        revision: number;
        name: string;
        error?: string;
      };
      if (!response.ok) throw new Error(value.error);
      current.current = value.data;
      revision.current = value.revision;
      setData(value.data);
      setName(value.name);
      setLoaded(true);
      setStatus('All changes saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load');
      setStatus('Could not connect');
    }
  }, []);
  // This effect starts a network read; every state update in load occurs after await.
  useEffect(() => {
    // oxlint-disable-next-line react/react-compiler
    void load();
  }, [load]);
  const flush = useCallback(async () => {
    if (busy.current || !dirty.current || failed.current) return;
    busy.current = true;
    setStatus('Saving…');
    try {
      while (dirty.current) {
        const snapshot = current.current;
        dirty.current = false;
        const response = await fetch('/api/data', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: snapshot, revision: revision.current }),
        });
        const result = (await response.json()) as {
          revision: number;
          error?: string;
        };
        if (!response.ok) throw new Error(result.error);
        revision.current = result.revision;
      }
      setStatus('All changes saved');
      setError('');
    } catch (e) {
      dirty.current = true;
      failed.current = true;
      setStatus('Changes not saved');
      setError(
        e instanceof Error
          ? e.message
          : 'Keep this page open and retry saving.',
      );
    } finally {
      busy.current = false;
    }
  }, []);
  const update = useCallback(
    (fn: (d: FitnessData) => FitnessData) => {
      if (!loaded) return;
      const next = fn(current.current);
      current.current = next;
      setData(next);
      dirty.current = true;
      setStatus('Unsaved changes');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 500);
    },
    [loaded, flush],
  );
  const retry = () => {
    failed.current = false;
    setError('');
    if (loaded) void flush();
    else void load();
  };
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty.current || busy.current) {
        event.preventDefault();
      }
    };
    const hide = () => {
      if (document.visibilityState === 'hidden') void flush();
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('visibilitychange', hide);
    return () => {
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('visibilitychange', hide);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [flush]);
  return { data, update, loaded, name, status, error, retry, flush };
}
