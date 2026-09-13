import { useState } from 'react';
import { View } from 'react-native';
import { Bookmark, Plus, X } from 'lucide-react-native';
import { randomUUID } from 'expo-crypto';
import type { Routine } from '../../../lib/fitness';
import { useTheme } from '../theme';
import { useI18n } from '../i18n';
import {
  Field,
  IconButton,
  Input,
  PrimaryButton,
  SecondaryButton,
  Segmented,
  Sheet,
  T,
  TextButton,
  Thumbnail,
} from '../ui';
import { PickerBody } from './exercise-picker';

type Item = Routine['exercises'][number];

export function RoutineEditor({
  routine,
  open,
  onClose,
  onSave,
}: {
  routine: Routine | null;
  open: boolean;
  onClose: () => void;
  onSave: (routine: Routine) => void;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [name, setName] = useState(routine?.name ?? ''),
    [exercises, setExercises] = useState<Item[]>(routine?.exercises ?? []),
    [drafts, setDrafts] = useState<Record<string, string>>({}),
    [picking, setPicking] = useState(false),
    [error, setError] = useState('');
  const edit = (i: number, patch: Partial<Item>) =>
    setExercises(exercises.map((v, j) => (j === i ? { ...v, ...patch } : v)));
  const numberField = (
    i: number,
    key: 'sets' | 'reps' | 'restSeconds',
    label: string,
    max: number,
  ) => {
    const draftKey = `${i}-${key}`;
    const current = exercises[i][key];
    return (
      <View style={{ flex: 1, gap: 6 }}>
        <T size={11} line={14} color={theme.muted}>
          {label}
        </T>
        <Input
          accessibilityLabel={`${label} for ${exercises[i].name}`}
          keyboardType="number-pad"
          inputMode="numeric"
          value={
            drafts[draftKey] ?? (current === undefined ? '' : String(current))
          }
          onChangeText={(value) => {
            setDrafts({ ...drafts, [draftKey]: value });
            const parsed = Number(value);
            if (
              value.trim() &&
              Number.isInteger(parsed) &&
              parsed >= 0 &&
              parsed <= max
            )
              edit(i, { [key]: parsed } as Partial<Item>);
          }}
          style={{ minHeight: 40, paddingVertical: 7, paddingHorizontal: 10 }}
        />
      </View>
    );
  };
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        picking
          ? t('editor.addExercise')
          : routine
            ? t('editor.editPlan')
            : t('editor.createPlan')
      }
      description={picking ? t('editor.pickHint') : t('editor.hint')}
    >
      {picking ? (
        <>
          <TextButton
            label={t('editor.back')}
            onPress={() => setPicking(false)}
          />
          <PickerBody
            onPick={(exerciseName, muscle) => {
              setExercises([
                ...exercises,
                {
                  name: exerciseName,
                  muscle,
                  sets: 3,
                  reps: 10,
                  restSeconds: 90,
                },
              ]);
              setPicking(false);
            }}
          />
        </>
      ) : (
        <>
          <Field label={t('editor.planName')}>
            <Input
              accessibilityLabel={t('editor.planName')}
              value={name}
              onChangeText={setName}
              maxLength={100}
              placeholder={t('editor.namePlaceholder')}
            />
          </Field>
          <View style={{ gap: 12, marginVertical: 18 }}>
            {exercises.map((x, i) => (
              <View
                key={`${x.name}-${i}`}
                style={{
                  padding: 13,
                  backgroundColor: theme.soft,
                  borderRadius: 15,
                  gap: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <Thumbnail name={x.name} size={42} />
                  <T weight={500} size={14} line={18} style={{ flex: 1 }}>
                    {x.name}
                  </T>
                  <IconButton
                    icon={<X size={17} color={theme.muted} />}
                    accessibilityLabel={t('editor.remove', { name: x.name })}
                    size={36}
                    onPress={() =>
                      setExercises(exercises.filter((_, j) => j !== i))
                    }
                  />
                </View>
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 10,
                    alignItems: 'flex-end',
                  }}
                >
                  <View style={{ gap: 6 }}>
                    <T size={11} line={14} color={theme.muted}>
                      {t('editor.unit')}
                    </T>
                    <Segmented
                      compact
                      accessibilityLabel={t('editor.unitFor', { name: x.name })}
                      options={[
                        { value: 'kg', label: 'kg' },
                        { value: 'lb', label: 'lb' },
                      ]}
                      labelFor={(o) => `${x.name} ${o.label}`}
                      value={x.unit ?? 'kg'}
                      onChange={(unit) => edit(i, { unit })}
                    />
                  </View>
                  {numberField(i, 'sets', t('editor.sets'), 50)}
                  {numberField(i, 'reps', t('editor.reps'), 1000)}
                  {numberField(i, 'restSeconds', t('editor.rest'), 600)}
                </View>
              </View>
            ))}
          </View>
          <SecondaryButton
            full
            label={t('editor.addExercise')}
            icon={<Plus size={18} color={theme.secondaryText} />}
            disabled={exercises.length >= 60}
            onPress={() => setPicking(true)}
          />
          {!!error && (
            <T
              size={13}
              line={18}
              color={theme.errorText}
              style={{ marginTop: 14 }}
              accessibilityRole="alert"
            >
              {error}
            </T>
          )}
          <View style={{ marginTop: 22 }}>
            <PrimaryButton
              full
              label={t('editor.save')}
              icon={<Bookmark size={19} color={theme.primaryText} />}
              onPress={() => {
                if (!name.trim() || !exercises.length) {
                  setError(t('editor.nameError'));
                  return;
                }
                if (
                  exercises.some(
                    (x) =>
                      !Number.isInteger(x.sets) ||
                      x.sets < 1 ||
                      x.sets > 50 ||
                      !Number.isInteger(x.reps) ||
                      x.reps < 1 ||
                      x.reps > 1000 ||
                      (x.restSeconds !== undefined &&
                        (!Number.isInteger(x.restSeconds) ||
                          x.restSeconds < 0 ||
                          x.restSeconds > 600)),
                  )
                ) {
                  setError(t('editor.rangeError'));
                  return;
                }
                onSave({
                  id: routine?.id ?? randomUUID(),
                  name: name.trim(),
                  exercises,
                });
                onClose();
              }}
            />
          </View>
        </>
      )}
    </Sheet>
  );
}
