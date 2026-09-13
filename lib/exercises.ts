import library from './exercise-library.json';
import { EXERCISES as CURATED } from './fitness.ts';

/**
 * The full exercise library: the curated list that ships with illustrations,
 * extended with free-exercise-db (public domain). Library entries carry
 * step-by-step instructions and two photo frames, which the app plays as a
 * simple demonstration. Animations are free for everyone today; keep the
 * `GUIDES_FREE` flag so a premium tier can gate them later.
 */
export const GUIDES_FREE = true;

export type LibraryExercise = {
  id: string;
  name: string;
  muscle: string;
  equipment: string;
  primary: string[];
  secondary: string[];
  level: string;
  mechanic: string | null;
  category: string;
  instructions: string[];
  frames: number;
};
type Library = {
  source: string;
  commit: string;
  imageBase: string;
  exercises: LibraryExercise[];
};
const LIBRARY = library as Library;
export const EXERCISE_SOURCE = {
  name: 'free-exercise-db',
  url: 'https://github.com/yuhonas/free-exercise-db',
  license: 'Public domain (Unlicense)',
};
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const byName = new Map(LIBRARY.exercises.map((e) => [norm(e.name), e]));

/** Curated names that the library knows under a different title. */
const ALIASES: Record<string, string> = {
  'Bench press': 'Barbell Bench Press - Medium Grip',
  'Incline barbell press': 'Barbell Incline Bench Press - Medium Grip',
  'Close-grip bench press': 'Close-Grip Barbell Bench Press',
  'Incline dumbbell press': 'Incline Dumbbell Press',
  'Dumbbell fly': 'Dumbbell Flyes',
  'Dumbbell pullover': 'Bent-Arm Dumbbell Pullover',
  'Cable fly': 'Cable Crossover',
  'Push-up': 'Pushups',
  'Chest dip': 'Dips - Chest Version',
  'Chest press machine': 'Leverage Chest Press',
  'Pec deck': 'Butterfly',
  'Lat pulldown': 'Wide-Grip Lat Pulldown',
  'Seated cable row': 'Seated Cable Rows',
  'Pull-up': 'Pullups',
  'Dumbbell row': 'One-Arm Dumbbell Row',
  'Bent-over barbell row': 'Bent Over Barbell Row',
  'Back extension': 'Hyperextensions (Back Extensions)',
  'Front squat': 'Front Barbell Squat',
  'Leg extension': 'Leg Extensions',
  'Lying leg curl': 'Lying Leg Curls',
  'Standing calf raise': 'Standing Calf Raises',
  'Hack squat': 'Barbell Hack Squat',
  'Dumbbell lunge': 'Dumbbell Lunges',
  'Dumbbell Romanian deadlift': 'Stiff-Legged Dumbbell Deadlift',
  'Step-up': 'Dumbbell Step Ups',
  'Reverse lunge': 'Dumbbell Rear Lunge',
  'Glute bridge': 'Butt Lift (Bridge)',
  'Walking lunge': 'Bodyweight Walking Lunge',
  'Shoulder press': 'Dumbbell Shoulder Press',
  'Lateral raise': 'Side Lateral Raise',
  'Arnold press': 'Arnold Dumbbell Press',
  'Front raise': 'Front Dumbbell Raise',
  'Rear delt fly': 'Reverse Flyes',
  'Overhead press': 'Barbell Shoulder Press',
  'Upright row': 'Upright Barbell Row',
  'Biceps curl': 'Dumbbell Bicep Curl',
  'Hammer curl': 'Hammer Curls',
  'Concentration curl': 'Concentration Curls',
  'Triceps kickback': 'Tricep Dumbbell Kickback',
  'Skull crusher': 'Lying Triceps Press',
  'Triceps dip': 'Dips - Triceps Version',
  Crunch: 'Crunches',
  'Bicycle crunch': 'Air Bike',
  Deadlift: 'Barbell Deadlift',
  'Kettlebell swing': 'One-Arm Kettlebell Swings',
};

/** Library details for a name, if the library covers it. */
export function exerciseDetail(name: string): LibraryExercise | null {
  return (
    byName.get(norm(ALIASES[name] ?? name)) ?? byName.get(norm(name)) ?? null
  );
}
/** Start and end photo of the movement, when available. */
export function exerciseFrames(name: string): string[] {
  const e = exerciseDetail(name);
  if (!e || e.frames < 1) return [];
  return Array.from(
    { length: e.frames },
    (_, i) => `${LIBRARY.imageBase}${e.id}/${i}.jpg`,
  );
}
const curatedNames = new Set(CURATED.map(([n]) => norm(n)));
const aliasTargets = new Set(Object.values(ALIASES).map(norm));
/** Every exercise offered in the pickers: curated first, then the library. */
export const ALL_EXERCISES: readonly (readonly [string, string, string])[] = [
  ...CURATED,
  ...LIBRARY.exercises
    .filter(
      (e) => !curatedNames.has(norm(e.name)) && !aliasTargets.has(norm(e.name)),
    )
    .map((e) => [e.name, e.muscle, e.equipment] as const),
];
export const EQUIPMENT_OPTIONS = [...new Set(ALL_EXERCISES.map((e) => e[2]))];
