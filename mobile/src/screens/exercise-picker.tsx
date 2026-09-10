import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Plus, Search } from 'lucide-react-native';
import { EXERCISES } from '../../../lib/fitness';
import { useTheme } from '../theme';
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
const EQUIPMENT = ['All', ...new Set(EXERCISES.map((e) => e[2]))];

export function PickerBody({
  onPick,
}: {
  onPick: (name: string, muscle: string) => void;
}) {
  const { theme } = useTheme();
  const [query, setQuery] = useState(''),
    [muscle, setMuscle] = useState('All'),
    [equipment, setEquipment] = useState('All');
  const list = EXERCISES.filter(
    ([n, m, eq]) =>
      `${n} ${m} ${eq}`.toLowerCase().includes(query.trim().toLowerCase()) &&
      (muscle === 'All' || m === muscle) &&
      (equipment === 'All' || eq === equipment),
  );
  const custom =
    query.trim() &&
    !EXERCISES.some(([n]) => n.toLowerCase() === query.trim().toLowerCase());
  return (
    <View style={{ gap: 12, marginTop: 16 }}>
      <View style={{ justifyContent: 'center' }}>
        <Input
          accessibilityLabel="Search exercises"
          placeholder="Search exercises"
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
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {MUSCLES.map((m) => (
          <Chip key={m} label={m} selected={muscle === m} onPress={() => setMuscle(m)} />
        ))}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
        {EQUIPMENT.map((e) => (
          <Chip
            key={e}
            label={e === 'All' ? 'All equipment' : e}
            selected={equipment === e}
            onPress={() => setEquipment(e)}
          />
        ))}
      </ScrollView>
      <Body size={12} accessibilityLiveRegion="polite">
        {list.length} exercises found
      </Body>
      <View style={{ gap: 7 }}>
        {!list.length && !custom && (
          <Body size={14}>No matches. Try another search or change the filters.</Body>
        )}
        {list.map(([name, m, eq]) => (
          <Press
            key={name}
            accessibilityRole="button"
            accessibilityLabel={`Add ${name}`}
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
            <Plus size={19} color={theme.textButton} />
          </Press>
        ))}
        {custom ? (
          <Press
            accessibilityRole="button"
            accessibilityLabel={`Add custom exercise: ${query.trim()}`}
            onPress={() => {
              onPick(query.trim().slice(0, 100), muscle === 'All' ? 'Custom' : muscle);
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
                Add “{query.trim()}”
              </T>
              <T size={11} line={15} color={theme.placeholder}>
                Custom exercise
              </T>
            </View>
          </Press>
        ) : null}
      </View>
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
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Add exercise"
      description={`${EXERCISES.length} exercises. Filter by muscle and equipment, or add your own.`}
    >
      <PickerBody onPick={onPick} />
    </Sheet>
  );
}
