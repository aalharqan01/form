import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EMPTY, validateData, type FitnessData } from '../../lib/fitness';
import { mergeData, type Envelope } from '../../lib/sync';
import type { CoachingState, MemberDetail } from '../../lib/coaching';
import { request, type FitnessResponse } from './api';
import { PREVIEW_ROLE, USER_KEY } from './account';

const CACHE = `form-trainee:${USER_KEY || `hosted-${PREVIEW_ROLE ?? 'me'}`}:v1`;
export function useTraining() {
  const [data, setData] = useState<FitnessData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState('Connecting…');
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [detail, setDetail] = useState<MemberDetail | null>(null);
  const [coachError, setCoachError] = useState('');
  const coachingBusy = useRef(false);
  const envelope = useRef<Envelope | null>(null);
  const busy = useRef(false);
  const halted = useRef(false);
  const initialized = useRef(false);
  const persistence = useRef(Promise.resolve());
  const publish = useCallback((value: Envelope) => {
    envelope.current = value;
    setData(value.data);
    setLoaded(true);
    const write = persistence.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(CACHE, JSON.stringify(value)));
    persistence.current = write;
    void write.catch(() =>
      setError(
        'Device storage is unavailable. Keep the app open until your changes are synced.',
      ),
    );
    return write;
  }, []);
  const sync = useCallback(async () => {
    if (busy.current || halted.current) return;
    busy.current = true;
    try {
      const remote = await request<FitnessResponse>('/api/data');
      if (USER_KEY && remote.userKey !== USER_KEY)
        throw new Error(
          'The signed-in account changed. Reopen the app before editing.',
        );
      if (!validateData(remote.data))
        throw new Error(
          'Could not verify the synced log. Your saved data is retained.',
        );
      const local = envelope.current;
      if (local && !local.dirty && local.revision === remote.revision) {
        setStatus('Synced');
        setError('');
        return;
      }
      let next = remote.data;
      if (local?.dirty) {
        try {
          next = mergeData(local.base, local.data, remote.data);
        } catch (e) {
          halted.current = true;
          setConflict(true);
          throw e;
        }
      }
      await publish({
        userKey: remote.userKey,
        data: next,
        base: remote.data,
        revision: remote.revision,
        dirty: JSON.stringify(next) !== JSON.stringify(remote.data),
      });
      while (envelope.current?.dirty) {
        const sent = envelope.current;
        setStatus('Syncing…');
        const result = await request<{ revision: number }>(
          '/api/data',
          { data: sent.data, revision: sent.revision },
          'PUT',
        );
        const current = envelope.current!;
        await publish({
          ...current,
          base: sent.data,
          revision: result.revision,
          dirty: JSON.stringify(current.data) !== JSON.stringify(sent.data),
        });
      }
      setStatus('Synced');
      setError('');
    } catch (e) {
      setStatus(
        envelope.current
          ? 'Saved on device · sync pending'
          : 'Unable to connect',
      );
      setError(
        e instanceof Error
          ? e.message
          : 'Your changes are retained on this device.',
      );
    } finally {
      busy.current = false;
    }
  }, [publish]);
  const refreshCoach = useCallback(async () => {
    if (coachingBusy.current) return;
    coachingBusy.current = true;
    try {
      const state = await request<CoachingState>('/api/coaching');
      if (USER_KEY && state.userId !== USER_KEY)
        throw new Error('The coaching account changed. Reopen the app.');
      const member = state.memberships.find((m) => m.status === 'active');
      const next = member
        ? await request<MemberDetail>(
            `/api/coaching?member=${encodeURIComponent(member.id)}`,
          )
        : null;
      setDetail(next);
      setCoachError('');
      await AsyncStorage.setItem(CACHE + ':coach', JSON.stringify(next));
    } catch {
      setCoachError(
        'Coaching could not refresh. Showing the last available plan; sending messages and check-ins needs a connection.',
      );
    } finally {
      coachingBusy.current = false;
    }
  }, []);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(CACHE);
        const saved = raw ? (JSON.parse(raw) as Envelope) : null;
        if (
          alive &&
          saved &&
          (!USER_KEY || saved.userKey === USER_KEY) &&
          validateData(saved.data) &&
          validateData(saved.base) &&
          Number.isInteger(saved.revision)
        )
          await publish(saved);
      } catch {
        if (alive)
          setError(
            'Could not read the device cache. Connecting to your saved log…',
          );
      }
      try {
        const raw = await AsyncStorage.getItem(CACHE + ':coach');
        const saved = raw ? (JSON.parse(raw) as MemberDetail) : null;
        if (
          alive &&
          saved &&
          (!USER_KEY || saved.member?.trainee_id === USER_KEY) &&
          Array.isArray(saved.messages) &&
          Array.isArray(saved.checkins)
        )
          setDetail(saved);
      } catch {
        /* The network refresh can recover a missing coaching cache. */
      }
      if (alive) {
        initialized.current = true;
        await sync();
        await refreshCoach();
      }
    })();
    const interval = setInterval(() => {
      if (initialized.current && AppState.currentState !== 'background') {
        void sync();
        void refreshCoach();
      }
    }, 3000);
    const subscription = AppState.addEventListener('change', (state) => {
      if (initialized.current && state === 'active') {
        void sync();
        void refreshCoach();
      }
    });
    return () => {
      alive = false;
      clearInterval(interval);
      subscription.remove();
    };
  }, [publish, sync, refreshCoach]);
  const update = async (change: (current: FitnessData) => FitnessData) => {
    if (!envelope.current || halted.current)
      throw new Error(
        'Resolve the connection or sync conflict before editing.',
      );
    const next = change(envelope.current.data);
    if (!validateData(next))
      throw new Error(
        'Check the entered values. Your previous log is unchanged.',
      );
    await publish({ ...envelope.current, data: next, dirty: true });
    setStatus('Saved on device');
    void sync();
  };
  const resolve = async (keepLocal: boolean) => {
    const remote = await request<FitnessResponse>('/api/data');
    if (
      remote.userKey !== envelope.current?.userKey ||
      !validateData(remote.data)
    )
      throw new Error('Account or log changed. Reopen the app.');
    await AsyncStorage.setItem(
      CACHE + ':conflict-backup',
      JSON.stringify(envelope.current),
    );
    await publish({
      userKey: remote.userKey,
      base: remote.data,
      data: keepLocal ? envelope.current!.data : remote.data,
      revision: remote.revision,
      dirty: keepLocal,
    });
    halted.current = false;
    setConflict(false);
    await sync();
  };
  return {
    data,
    loaded,
    status,
    error,
    conflict,
    detail,
    coachError,
    update,
    resolve,
    refresh: async () => {
      await sync();
      await refreshCoach();
    },
    refreshCoach,
  };
}
export type Training = ReturnType<typeof useTraining>;
