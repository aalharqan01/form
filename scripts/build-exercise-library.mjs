import { readFile, writeFile } from 'node:fs/promises';

// Builds lib/exercise-library.json from free-exercise-db (public domain,
// https://github.com/yuhonas/free-exercise-db). Pinned to one commit so the
// photo URLs never change under us. Re-run to refresh, then review the diff.
const COMMIT = 'a859101d633a';
const SOURCE = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/${COMMIT}/dist/exercises.json`;
export const IMAGE_BASE = `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@${COMMIT}/exercises/`;

const GROUPS = {
  abdominals: 'Core',
  abductors: 'Legs',
  adductors: 'Legs',
  biceps: 'Arms',
  calves: 'Legs',
  chest: 'Chest',
  forearms: 'Arms',
  glutes: 'Legs',
  hamstrings: 'Legs',
  lats: 'Back',
  'lower back': 'Back',
  'middle back': 'Back',
  neck: 'Shoulders',
  quadriceps: 'Legs',
  shoulders: 'Shoulders',
  traps: 'Back',
  triceps: 'Arms',
};
const EQUIPMENT = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  cable: 'Cable',
  machine: 'Machine',
  'body only': 'Bodyweight',
  kettlebells: 'Kettlebell',
  bands: 'Bands',
  'medicine ball': 'Other',
  'exercise ball': 'Other',
  'foam roll': 'Other',
  'e-z curl bar': 'Barbell',
  other: 'Other',
};
const title = (s) =>
  s
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase());
// FORM_EXERCISE_SOURCE can point at a local copy of dist/exercises.json.
const local = process.env.FORM_EXERCISE_SOURCE;
const source = local
  ? JSON.parse(await readFile(local, 'utf8'))
  : await (async () => {
      const response = await fetch(SOURCE);
      if (!response.ok) throw new Error(`Download failed: ${response.status}`);
      return response.json();
    })();
const library = source
  .filter((e) => e.category !== 'stretching' && e.category !== 'cardio')
  .map((e) => {
    const primary = e.primaryMuscles?.[0];
    const muscle =
      ['olympic weightlifting', 'strongman'].includes(e.category) &&
      e.mechanic === 'compound'
        ? 'Full body'
        : (GROUPS[primary] ?? 'Full body');
    return {
      id: e.id,
      name: title(e.name),
      muscle,
      equipment: EQUIPMENT[e.equipment ?? 'other'] ?? 'Other',
      primary: e.primaryMuscles ?? [],
      secondary: e.secondaryMuscles ?? [],
      level: e.level,
      mechanic: e.mechanic ?? null,
      category: e.category,
      instructions: e.instructions ?? [],
      frames: (e.images ?? []).length,
    };
  })
  .sort((a, b) => a.name.localeCompare(b.name));
await writeFile(
  'lib/exercise-library.json',
  JSON.stringify({
    source: 'free-exercise-db',
    commit: COMMIT,
    imageBase: IMAGE_BASE,
    exercises: library,
  }) + '\n',
);
console.log(
  `Wrote ${library.length} exercises from ${source.length} (${COMMIT}).`,
);
