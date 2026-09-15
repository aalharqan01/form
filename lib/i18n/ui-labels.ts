import type { Key } from './index.ts';

export type Translator = (
  key: Key,
  vars?: Record<string, string | number>,
) => string;

const STATUS_KEYS = {
  invited: 'status.invited',
  requested: 'status.requested',
  awaiting_payment: 'status.awaitingPayment',
  rejected: 'status.rejected',
  withdrawn: 'status.withdrawn',
  active: 'status.active',
  ended: 'status.ended',
} as const;
export const memberStatusLabel = (
  status: keyof typeof STATUS_KEYS,
  t: Translator,
) => t(STATUS_KEYS[status]);

const WEEKDAYS = [
  'coachWeb.sunday',
  'coachWeb.monday',
  'coachWeb.tuesday',
  'coachWeb.wednesday',
  'coachWeb.thursday',
  'coachWeb.friday',
  'coachWeb.saturday',
] as const;
export const weekdayLabel = (day: number, t: Translator) => t(WEEKDAYS[day]);

const MUSCLES: Record<string, Key> = {
  All: 'picker.all',
  Chest: 'muscle.chest',
  Back: 'muscle.back',
  Legs: 'muscle.legs',
  Shoulders: 'muscle.shoulders',
  Arms: 'muscle.arms',
  Core: 'muscle.core',
  'Full body': 'muscle.fullBody',
  Custom: 'picker.customMuscle',
};
/** Translate library categories only; custom names and stored identifiers stay intact. */
export const muscleLabel = (value: string, t: Translator) =>
  MUSCLES[value] ? t(MUSCLES[value]) : value;

const EQUIPMENT: Record<string, Key> = {
  All: 'picker.allEquipment',
  Bands: 'coachWeb.equipmentBands',
  Barbell: 'coachWeb.equipmentBarbell',
  Bodyweight: 'coachWeb.equipmentBodyweight',
  Cable: 'coachWeb.equipmentCable',
  Dumbbell: 'coachWeb.equipmentDumbbell',
  Kettlebell: 'coachWeb.equipmentKettlebell',
  Machine: 'coachWeb.equipmentMachine',
  Other: 'coachWeb.equipmentOther',
};
export const equipmentLabel = (value: string, t: Translator) =>
  EQUIPMENT[value] ? t(EQUIPMENT[value]) : value;
