import { useSyncExternalStore } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Springs the way Apple parameterises them: a response (seconds to reach the
 * target) and a damping ratio (1 settles without overshoot; below 1 bounces).
 * Converted to the stiffness/damping/mass triplet Animated.spring reads.
 */
export function spring(response: number, dampingRatio = 1, mass = 1) {
  const omega = (2 * Math.PI) / response;
  const stiffness = omega * omega * mass;
  const damping = 2 * dampingRatio * Math.sqrt(stiffness * mass);
  return { stiffness, damping, mass };
}
export const springs = {
  /** Press release, chips, small state changes. */
  press: spring(0.22),
  /** Sheets, banners, anything that appears in place. */
  settle: spring(0.3),
  /** Repositioning an element already on screen. */
  move: spring(0.4),
  /** After a flick or a throw: a little give, because momentum preceded it. */
  momentum: spring(0.35, 0.8),
};

/**
 * Where a flick would come to rest on its own, from Apple's Designing Fluid
 * Interfaces: exponential decay of the release velocity (px/s).
 */
export function project(velocity: number, decelerationRate = 0.998) {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/* ---------- prefers-reduced-motion / reduce transparency ---------- */
type Listener = () => void;
function mediaStore(query: string, native: () => Promise<boolean> | null, event?: string) {
  let current = false;
  const listeners = new Set<Listener>();
  const notify = () => listeners.forEach((l) => l());
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    if (Platform.OS === 'web') {
      if (typeof window === 'undefined' || !window.matchMedia) return;
      const mq = window.matchMedia(query);
      current = mq.matches;
      const onChange = () => {
        current = mq.matches;
        notify();
      };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      return;
    }
    const initial = native();
    if (initial)
      initial
        .then((value) => {
          current = value;
          notify();
        })
        .catch(() => {});
    if (event)
      AccessibilityInfo.addEventListener(event as never, ((value: boolean) => {
        current = value;
        notify();
      }) as never);
  };
  return {
    subscribe(listener: Listener) {
      start();
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    get: () => current,
  };
}
const reducedMotion = mediaStore(
  '(prefers-reduced-motion: reduce)',
  () => AccessibilityInfo.isReduceMotionEnabled(),
  'reduceMotionChanged',
);
const reducedTransparency = mediaStore(
  '(prefers-reduced-transparency: reduce)',
  () =>
    Platform.OS === 'ios' && AccessibilityInfo.isReduceTransparencyEnabled
      ? AccessibilityInfo.isReduceTransparencyEnabled()
      : null,
  'reduceTransparencyChanged',
);
/** True when the person asked the system for less motion; feedback stays, travel goes. */
export function useReducedMotion() {
  return useSyncExternalStore(
    reducedMotion.subscribe,
    reducedMotion.get,
    reducedMotion.get,
  );
}
/** True when translucent materials should read as solid surfaces instead. */
export function useReducedTransparency() {
  return useSyncExternalStore(
    reducedTransparency.subscribe,
    reducedTransparency.get,
    reducedTransparency.get,
  );
}
