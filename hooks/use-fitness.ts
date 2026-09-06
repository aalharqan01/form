'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { EMPTY, validateData, type FitnessData } from '@/lib/fitness';
import { mergeData, type Envelope } from '@/lib/sync';
const POINTER = 'form-account',
  prefix = 'form-log:';
function cached(key: string | null): Envelope | null {
  try {
    const v = JSON.parse(localStorage.getItem(prefix + key) || 'null');
    return v &&
      v.userKey === key &&
      validateData(v.data) &&
      validateData(v.base) &&
      Number.isInteger(v.revision)
      ? v
      : null;
  } catch {
    return null;
  }
}
function persist(e: Envelope) {
  localStorage.setItem(prefix + e.userKey, JSON.stringify(e));
  localStorage.setItem(POINTER, e.userKey);
}
type Remote = {
  data: FitnessData;
  revision: number;
  userKey: string;
  name: string;
  error?: string;
};
export function useFitness() {
  const [data, setData] = useState<FitnessData>(EMPTY),
    [loaded, setLoaded] = useState(false),
    [status, setStatus] = useState('Loading…'),
    [error, setError] = useState(''),
    [conflict, setConflict] = useState(false),
    [name, setName] = useState('Your');
  const envelope = useRef<Envelope | null>(null),
    busy = useRef(false),
    halted = useRef(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    localSafe = useRef(true),
    foreign = useRef(false);
  const publish = useCallback((e: Envelope) => {
    envelope.current = e;
    setData(e.data);
    setLoaded(true);
    try {
      persist(e);
      localSafe.current = true;
    } catch {
      localSafe.current = false;
      setError(
        'Phone storage is full or unavailable. Export a backup and keep this page open until synced.',
      );
    }
  }, []);
  const sync = useCallback(async () => {
    if (busy.current || halted.current) return;
    busy.current = true;
    try {
      if (!navigator.onLine) {
        setStatus(
          envelope.current
            ? 'Saved on phone · Offline'
            : 'Connect to load your log',
        );
        return;
      }
      const response = await fetch('/api/data', { cache: 'no-store' });
      if (response.status === 401) {
        halted.current = true;
        throw new Error(
          'Sign in again to sync. Your saved phone copy is retained.',
        );
      }
      if (!response.ok)
        throw new Error(
          'Sync unavailable. Your phone copy will retry automatically.',
        );
      const remote = (await response.json()) as Remote;
      if (!validateData(remote.data))
        throw new Error(
          'The server returned an invalid log. Your phone copy is preserved.',
        );
      if (envelope.current && envelope.current.userKey !== remote.userKey) {
        foreign.current = true;
        halted.current = true;
        throw new Error(
          'Another account is signed in. Reload before editing; your original phone copy is retained.',
        );
      }
      setName(remote.name);
      const local = envelope.current ?? cached(remote.userKey);
      let next = remote.data;
      if (local?.dirty) {
        try {
          next = mergeData(local.base, local.data, remote.data);
        } catch (e) {
          publish(local);
          halted.current = true;
          setConflict(true);
          throw e;
        }
      }
      publish({
        userKey: remote.userKey,
        data: next,
        base: remote.data,
        revision: remote.revision,
        dirty: JSON.stringify(next) !== JSON.stringify(remote.data),
      });
      while (envelope.current?.dirty) {
        const sent = envelope.current;
        setStatus('Syncing…');
        const r = await fetch('/api/data', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: sent.data, revision: sent.revision }),
        });
        if (r.status === 409)
          throw new Error('New changes on another device. Retrying sync…');
        if (r.status === 401) {
          halted.current = true;
          throw new Error(
            'Sign in again to sync. Your phone copy is retained.',
          );
        }
        if (!r.ok) {
          if (r.status === 400 || r.status === 413) halted.current = true;
          throw new Error(
            'Changes remain saved on your phone. Sync could not complete.',
          );
        }
        const result = (await r.json()) as { revision: number };
        const current = envelope.current!;
        publish({
          ...current,
          base: sent.data,
          revision: result.revision,
          dirty: JSON.stringify(current.data) !== JSON.stringify(sent.data),
        });
      }
      setStatus('Synced');
      if (localSafe.current) setError('');
    } catch (e) {
      setStatus(
        envelope.current ? 'Saved on phone · Pending sync' : 'Unable to load',
      );
      setError(
        e instanceof Error
          ? e.message
          : 'Offline. Changes are saved on your phone.',
      );
    } finally {
      busy.current = false;
    }
  }, [publish]);
  useEffect(() => {
    // Restore device-local data before attempting a network sync.
    const boot = setTimeout(() => {
      let local: Envelope | null = null;
      try {
        local = cached(localStorage.getItem(POINTER));
      } catch {}
      if (local) publish(local);
      void sync();
    }, 0);
    const reconnect = () => void sync();
    const visibility = () => {
      if (document.visibilityState === 'visible') void sync();
    };
    const interval = setInterval(() => {
      if (envelope.current?.dirty || !envelope.current) void sync();
    }, 15000);
    const warn = (e: BeforeUnloadEvent) => {
      if (!localSafe.current && envelope.current?.dirty) e.preventDefault();
    };
    const sibling = (e: StorageEvent) => {
      if (e.key === prefix + envelope.current?.userKey && e.newValue) {
        const other = cached(envelope.current?.userKey ?? null);
        if (other && envelope.current) {
          try {
            publish({
              ...other,
              data: mergeData(
                envelope.current.base,
                envelope.current.data,
                other.data,
              ),
              dirty: envelope.current.dirty || other.dirty,
            });
          } catch (err) {
            halted.current = true;
            setConflict(true);
            setError(
              err instanceof Error
                ? err.message
                : 'Another tab changed this log.',
            );
          }
        }
      }
    };
    window.addEventListener('online', reconnect);
    window.addEventListener('storage', sibling);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('beforeunload', warn);
    return () => {
      clearTimeout(boot);
      clearInterval(interval);
      if (timer.current) clearTimeout(timer.current);
      window.removeEventListener('online', reconnect);
      window.removeEventListener('storage', sibling);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('beforeunload', warn);
    };
  }, [sync, publish]);
  const update = useCallback(
    (fn: (d: FitnessData) => FitnessData) => {
      if (!envelope.current || foreign.current) return;
      publish({
        ...envelope.current,
        data: fn(envelope.current.data),
        dirty: true,
      });
      setStatus(
        navigator.onLine ? 'Saved on phone' : 'Saved on phone · Offline',
      );
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void sync(), 500);
    },
    [publish, sync],
  );
  const retry = () => {
    if (foreign.current) return;
    halted.current = false;
    setError('');
    void sync();
  };
  const resolve = async (choice: 'phone' | 'cloud') => {
    if (!envelope.current || busy.current) return;
    try {
      const r = await fetch('/api/data', { cache: 'no-store' });
      if (!r.ok) {
        setError('Reconnect to resolve this conflict.');
        return;
      }
      const remote = (await r.json()) as Remote;
      if (
        remote.userKey !== envelope.current.userKey ||
        !validateData(remote.data)
      )
        return;
      publish({
        userKey: remote.userKey,
        data: choice === 'phone' ? envelope.current.data : remote.data,
        base: remote.data,
        revision: remote.revision,
        dirty: choice === 'phone',
      });
      halted.current = false;
      setConflict(false);
      setError('');
      void sync();
    } catch {
      setError(
        'Reconnect to resolve this conflict. Your phone copy is preserved.',
      );
    }
  };
  const signOut = () => {
    if (envelope.current?.dirty) {
      setError('Sync or export your pending changes before signing out.');
      return false;
    }
    if (envelope.current)
      localStorage.removeItem(prefix + envelope.current.userKey);
    localStorage.removeItem(POINTER);
    return true;
  };
  return {
    data,
    update,
    loaded,
    name,
    status,
    error,
    retry,
    conflict,
    resolve,
    signOut,
    flush: sync,
  };
}
