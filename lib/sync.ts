import type { FitnessData } from './fitness';
export type Envelope = {
  userKey: string;
  data: FitnessData;
  base: FitnessData;
  revision: number;
  dirty: boolean;
};
const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
export function mergeData(
  base: FitnessData,
  local: FitnessData,
  remote: FitnessData,
): FitnessData {
  function merge(b: unknown, l: unknown, r: unknown, path: string): unknown {
    if (same(l, b)) return r;
    if (same(r, b) || same(l, r)) return l;
    if (Array.isArray(l) && Array.isArray(r) && Array.isArray(b)) {
      const sample = [...l, ...r, ...b].find(Boolean);
      const key =
        sample && typeof sample === 'object'
          ? 'id' in sample
            ? 'id'
            : 'date' in sample
              ? 'date'
              : null
          : null;
      if (key) {
        const map = (a: unknown[]) =>
          new Map(a.map((x) => [(x as Record<string, unknown>)[key], x]));
        const bm = map(b),
          lm = map(l),
          rm = map(r);
        return [...new Set([...rm.keys(), ...lm.keys(), ...bm.keys()])]
          .map((k) =>
            merge(bm.get(k), lm.get(k), rm.get(k), `${path}/${String(k)}`),
          )
          .filter((v) => v !== undefined);
      }
    }
    if (
      b &&
      l &&
      r &&
      typeof b === 'object' &&
      typeof l === 'object' &&
      typeof r === 'object' &&
      !Array.isArray(l) &&
      !Array.isArray(r)
    ) {
      const bo = b as Record<string, unknown>,
        lo = l as Record<string, unknown>,
        ro = r as Record<string, unknown>;
      return Object.fromEntries(
        [
          ...new Set([
            ...Object.keys(bo),
            ...Object.keys(lo),
            ...Object.keys(ro),
          ]),
        ]
          .map((k) => [k, merge(bo[k], lo[k], ro[k], `${path}/${k}`)])
          .filter(([, v]) => v !== undefined),
      );
    }
    throw new Error(
      `Both devices changed ${path.split('/')[1] || 'this log'}. Choose which version to keep. Your phone copy is preserved.`,
    );
  }
  return merge(base, local, remote, '') as FitnessData;
}
