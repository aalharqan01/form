import { useEffect, useRef, useState } from 'react';
import { AppState, Vibration } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { restRemaining } from '../../lib/training';
type Countdown = {
  workoutId: string;
  exerciseId: string;
  name: string;
  seconds: number;
  end: number | null;
};
export function useRest(workoutId: string | undefined) {
  const [clock, setClock] = useState(Date.now());
  const [timer, setTimer] = useState<Countdown | null>(null);
  const current = timer?.workoutId === workoutId ? timer : null;
  const end = current?.end ?? null;
  const version = useRef(0),
    writes = useRef(Promise.resolve()),
    alerted = useRef<number | null>(null);
  useEffect(() => {
    let alive = true;
    const readingVersion = version.current;
    if (!workoutId) return;
    void AsyncStorage.getItem('form-rest:' + workoutId)
      .then((raw) => {
        if (!alive || readingVersion !== version.current || !raw) return;
        const saved = JSON.parse(raw) as Countdown | number;
        if (typeof saved === 'number' && Number.isFinite(saved))
          setTimer({
            workoutId,
            exerciseId: '',
            name: 'Rest',
            seconds: 90,
            end: saved,
          });
        else if (
          typeof saved === 'object' &&
          saved?.workoutId === workoutId &&
          (saved.end === null || Number.isFinite(saved.end))
        )
          setTimer(saved);
      })
      .catch(() => {});
    const tick = () => setClock(Date.now());
    tick();
    const interval = setInterval(tick, 500);
    const subscription = AppState.addEventListener('change', tick);
    return () => {
      alive = false;
      clearInterval(interval);
      subscription.remove();
    };
  }, [workoutId]);
  const remaining = restRemaining(end, clock);
  useEffect(() => {
    if (
      end &&
      remaining === 0 &&
      alerted.current !== end &&
      AppState.currentState !== 'background'
    ) {
      Vibration.vibrate(250);
      alerted.current = end;
    }
  }, [remaining, end, clock]);
  const save = (value: Countdown | null) => {
    if (!workoutId) return;
    version.current += 1;
    setTimer(value);
    setClock(Date.now());
    writes.current = writes.current
      .catch(() => {})
      .then(() =>
        value
          ? AsyncStorage.setItem(
              'form-rest:' + workoutId,
              JSON.stringify(value),
            )
          : AsyncStorage.removeItem('form-rest:' + workoutId),
      );
    void writes.current.catch(() => {});
  };
  return {
    clock,
    remaining,
    end,
    name: current?.name ?? '',
    exerciseId: current?.exerciseId ?? '',
    start: (exercise: { id: string; name: string; restSeconds?: number }) => {
      if (workoutId) {
        const seconds = exercise.restSeconds ?? 90;
        save(
          seconds
            ? {
                workoutId,
                exerciseId: exercise.id,
                name: exercise.name,
                seconds,
                end: Date.now() + seconds * 1000,
              }
            : null,
        );
      }
    },
    skip: () => save(null),
    adjust: (amount: number) => {
      if (current)
        save({
          ...current,
          end: Math.max(Date.now(), current.end ?? Date.now()) + amount * 1000,
        });
    },
  };
}
export type Rest = ReturnType<typeof useRest>;
export function duration(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}
