import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Info, Plus, Search } from 'lucide-react-native';
import {
  ALL_EXERCISES,
  EQUIPMENT_OPTIONS,
  EXERCISE_SOURCE,
  exerciseDetail,
} from '../../../lib/exercises';
import { ExerciseGuideSheet } from './exercise-guide';
import { useTheme } from '../theme';
import { useI18n } from '../i18n';
import { Body, Chip, Input, Press, Sheet, T, Thumbnail } from '../ui';

const MUSCLES = [
  'All',
  'Chest',
  'Back',
  'Legs',
  'Shoulders',
  'Arms',
  'Core',
  'Full body',
];
const EQUIPMENT = ['All', ...EQUIPMENT_OPTIONS];

/** Muscle group names shown on filter chips and rows. */
export function muscleLabel(muscle: string, t: (key: MuscleKey) => string) {
  const key = MUSCLE_KEYS[muscle];
  return key ? t(key) : muscle;
}
const MUSCLE_KEYS: Record<string, MuscleKey> = {
  Chest: 'muscle.chest',
  Back: 'muscle.back',
  Legs: 'muscle.legs',
  Shoulders: 'muscle.shoulders',
  Arms: 'muscle.arms',
  Core: 'muscle.core',
  'Full body': 'muscle.fullBody',
};
type MuscleKey =
  | 'muscle.chest'
  | 'muscle.back'
  | 'muscle.legs'
  | 'muscle.shoulders'
  | 'muscle.arms'
  | 'muscle.core'
  | 'muscle.fullBody';

export function PickerBody({
  onPick,
}: {
  onPick: (name: string, muscle: string) => void;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [query, setQuery] = useState(''),
    [muscle, setMuscle] = useState('All'),
    [equipment, setEquipment] = useState('All'),
    [guide, setGuide] = useState<string | null>(null);
  const list = ALL_EXERCISES.filter(
    ([n, m, eq]) =>
      `${n} ${m} ${eq}`.toLowerCase().includes(query.trim().toLowerCase()) &&
      (muscle === 'All' || m === muscle) &&
      (equipment === 'All' || eq === equipment),
  );
  const custom =
    query.trim() &&
    !ALL_EXERCISES.some(
      ([n]) => n.toLowerCase() === query.trim().toLowerCase(),
    );
  return (
    <View style={{ gap: 12, marginTop: 16 }}>
      <View style={{ justifyContent: 'center' }}>
        <Input
          accessibilityLabel={t('picker.search')}
          placeholder={t('picker.search')}
          value={query}
          onChangeText={setQuery}
          maxLength={100}
          autoCorrect={false}
          style={{ paddingLeft: 43 }}
        />
        <View style={{ position: 'absolute', left: 15, pointerEvents: 'none' }}>
          <Search size={18} color={theme.muted} />
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
      >
        {MUSCLES.map((m) => (
          <Chip
            key={m}
            label={m === 'All' ? t('picker.all') : muscleLabel(m, t)}
            selected={muscle === m}
            onPress={() => setMuscle(m)}
          />
        ))}
      </ScrollView>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6 }}
      >
        {EQUIPMENT.map((e) => (
          <Chip
            key={e}
            label={e === 'All' ? t('picker.allEquipment') : e}
            selected={equipment === e}
            onPress={() => setEquipment(e)}
          />
        ))}
      </ScrollView>
      <Body size={12} accessibilityLiveRegion="polite">
        {t('picker.found', { count: list.length })}
      </Body>
      <View style={{ gap: 7 }}>
        {!list.length && !custom && (
          <Body size={14}>{t('picker.noMatches')}</Body>
        )}
        {list.map(([name, m, eq]) => (
          <Press
            key={name}
            accessibilityRole="button"
            accessibilityLabel={t('picker.add', { name })}
            onPress={() => {
              onPick(name, m);
              setQuery('');
            }}
            scale={0.985}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: theme.soft,
              borderRadius: 14,
              padding: 12,
            }}
          >
            <Thumbnail name={name} size={42} />
            <View style={{ flex: 1 }}>
              <T weight={500} size={14} line={19}>
                {name}
              </T>
              <T size={11} line={15} color={theme.placeholder}>
                {m} · {eq}
              </T>
            </View>
            {exerciseDetail(name) && (
              <Press
                accessibilityRole="button"
                accessibilityLabel={t('workout.howToDo', { name })}
                onPress={() => setGuide(name)}
                scale={0.9}
                style={{
                  width: 36,
                  height: 36,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Info size={18} color={theme.muted} />
              </Press>
            )}
            <Plus size={19} color={theme.textButton} />
          </Press>
        ))}
        {custom ? (
          <Press
            accessibilityRole="button"
            accessibilityLabel={t('picker.addCustom', { name: query.trim() })}
            onPress={() => {
              onPick(
                query.trim().slice(0, 100),
                muscle === 'All' ? t('picker.customMuscle') : muscle,
              );
              setQuery('');
            }}
            scale={0.985}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              backgroundColor: theme.soft,
              borderRadius: 14,
              padding: 12,
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                borderRadius: 11,
                backgroundColor: theme.deep,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={21} color={theme.textButton} />
            </View>
            <View style={{ flex: 1 }}>
              <T weight={500} size={14} line={19}>
                {t('picker.addQuoted', { name: query.trim() })}
              </T>
              <T size={11} line={15} color={theme.placeholder}>
                {t('picker.custom')}
              </T>
            </View>
          </Press>
        ) : null}
      </View>
      <ExerciseGuideSheet name={guide} onClose={() => setGuide(null)} />
      <Body size={11} style={{ marginTop: 6 }}>
        Exercise data and photos: {EXERCISE_SOURCE.name},{' '}
        {EXERCISE_SOURCE.license.toLowerCase()}. Illustrations: Everkinetic, CC
        BY-SA 4.0.
      </Body>
    </View>
  );
}

export function ExercisePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (name: string, muscle: string) => void;
}) {
  const { t } = useI18n();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('picker.title')}
      description={t('picker.description', { count: ALL_EXERCISES.length })}
    >
      <PickerBody onPick={onPick} />
    </Sheet>
  );
}
