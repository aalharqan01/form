import { useState } from 'react';
import { View } from 'react-native';
import {
  Bookmark,
  GripVertical,
  Link2,
  MoreHorizontal,
  Plus,
  Trash2,
  Unlink,
} from 'lucide-react-native';
import { randomUUID } from 'expo-crypto';
import type { Routine } from '../../../lib/fitness';
import { useTheme } from '../theme';
import { useI18n } from '../i18n';
import {
  Body,
  Field,
  Input,
  Press,
  PrimaryButton,
  Reveal,
  SecondaryButton,
  Segmented,
  Sheet,
  T,
  TextButton,
  Thumbnail,
} from '../ui';
import { PickerBody } from './exercise-picker';
import {
  ArrangeSheet,
  PairSheet,
  pairInto,
  supersetLetters,
  unpairFrom,
} from './exercise-tools';

type Item = Routine['exercises'][number] & { key: string };

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
    [exercises, setExercises] = useState<Item[]>(
      (routine?.exercises ?? []).map((e) => ({ ...e, key: randomUUID() })),
    ),
    [drafts, setDrafts] = useState<Record<string, string>>({}),
    [picking, setPicking] = useState(false),
    [arranging, setArranging] = useState(false),
    [menu, setMenu] = useState<Item | null>(null),
    [pairing, setPairing] = useState<Item | null>(null),
    [shown, setShown] = useState(true),
    [error, setError] = useState('');
  // Let the sheet play its exit before the parent unmounts the editor.
  const close = () => {
    setShown(false);
    setTimeout(onClose, 170);
  };
  const letters = supersetLetters(exercises);
  const keyOf = (item: Item) => item.key;
  const edit = (key: string, patch: Partial<Item>) =>
    setExercises(
      exercises.map((v) => (v.key === key ? { ...v, ...patch } : v)),
    );
  const items = exercises.map((e) => ({
    key: e.key,
    name: e.name,
    muscle: e.muscle,
  }));
  /** Whole-number field; an empty optional field clears the value. */
  const numberField = (
    item: Item,
    field: 'sets' | 'reps' | 'restSeconds',
    label: string,
    max: number,
    placeholder?: string,
  ) => {
    const draftKey = `${item.key}-${field}`;
    const current = item[field];
    return (
      <View style={{ flex: 1, gap: 6 }}>
        <T size={11} line={14} color={theme.muted}>
          {label}
        </T>
        <Input
          accessibilityLabel={`${label} for ${item.name}`}
          keyboardType="number-pad"
          inputMode="numeric"
          placeholder={placeholder}
          value={
            drafts[draftKey] ?? (current === undefined ? '' : String(current))
          }
          onChangeText={(value) => {
            setDrafts({ ...drafts, [draftKey]: value });
            if (!value.trim()) {
              if (field !== 'sets') edit(item.key, { [field]: undefined });
              return;
            }
            const parsed = Number(value);
            if (Number.isInteger(parsed) && parsed >= 0 && parsed <= max)
              edit(item.key, { [field]: parsed } as Partial<Item>);
          }}
          style={{ minHeight: 40, paddingVertical: 7, paddingHorizontal: 10 }}
        />
      </View>
    );
  };
  const save = () => {
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
          (x.reps !== undefined &&
            (!Number.isInteger(x.reps) || x.reps < 1 || x.reps > 1000)) ||
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
      exercises: exercises.map(({ key: _key, ...rest }) => rest),
    });
    close();
  };
  return (
    <>
      <Sheet
        open={open && shown}
        onClose={close}
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
          <Reveal key="pick" y={10} duration={220}>
            <TextButton
              label={t('editor.back')}
              onPress={() => setPicking(false)}
            />
            <PickerBody
              onPick={(exerciseName, muscle) => {
                setExercises([
                  ...exercises,
                  { key: randomUUID(), name: exerciseName, muscle, sets: 3 },
                ]);
                setPicking(false);
              }}
            />
          </Reveal>
        ) : (
          <Reveal key="plan" y={10} duration={220}>
            <Field label={t('editor.planName')}>
              <Input
                accessibilityLabel={t('editor.planName')}
                value={name}
                onChangeText={setName}
                maxLength={100}
                placeholder={t('editor.namePlaceholder')}
              />
            </Field>
            <View style={{ gap: 10, marginVertical: 16 }}>
              {exercises.map((x, i) => (
                <Reveal
                  key={x.key}
                  y={8}
                  duration={220}
                  delay={Math.min(i, 5) * 30}
                >
                  <View
                    style={{
                      padding: 12,
                      backgroundColor: theme.soft,
                      borderRadius: 14,
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
                      <Thumbnail name={x.name} size={40} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <T weight={500} size={14} line={18} numberOfLines={1}>
                          {x.name}
                        </T>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            marginTop: 2,
                          }}
                        >
                          <Body size={11}>{x.muscle}</Body>
                          {x.supersetId ? (
                            <View
                              style={{
                                paddingHorizontal: 6,
                                paddingVertical: 1,
                                borderRadius: 7,
                                backgroundColor: theme.setDone,
                              }}
                            >
                              <T
                                size={10}
                                line={14}
                                weight={500}
                                color={theme.setDoneText}
                              >
                                {t('workout.supersetTag', {
                                  letter: letters.get(x.supersetId) ?? '',
                                })}
                              </T>
                            </View>
                          ) : null}
                        </View>
                      </View>
                      <Press
                        accessibilityRole="button"
                        accessibilityLabel={t('editor.options', {
                          name: x.name,
                        })}
                        onPress={() => setMenu(x)}
                        scale={0.88}
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 15,
                          backgroundColor: theme.surface,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <MoreHorizontal size={17} color={theme.secondaryText} />
                      </Press>
                    </View>
                    <View
                      style={{
                        flexDirection: 'row',
                        gap: 8,
                        alignItems: 'flex-end',
                      }}
                    >
                      <View style={{ gap: 6 }}>
                        <T size={11} line={14} color={theme.muted}>
                          {t('editor.unit')}
                        </T>
                        <Segmented
                          compact
                          accessibilityLabel={t('editor.unitFor', {
                            name: x.name,
                          })}
                          options={[
                            { value: 'kg', label: 'kg' },
                            { value: 'lb', label: 'lb' },
                          ]}
                          labelFor={(o) => `${x.name} ${o.label}`}
                          value={x.unit ?? 'kg'}
                          onChange={(unit) => edit(x.key, { unit })}
                        />
                      </View>
                      {numberField(x, 'sets', t('editor.sets'), 50)}
                      {numberField(
                        x,
                        'reps',
                        t('editor.repsOptional'),
                        1000,
                        t('editor.any'),
                      )}
                      {numberField(
                        x,
                        'restSeconds',
                        t('editor.restOptional'),
                        600,
                        t('editor.default'),
                      )}
                    </View>
                  </View>
                </Reveal>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1.6 }}>
                <SecondaryButton
                  full
                  label={t('editor.addExercise')}
                  icon={<Plus size={18} color={theme.secondaryText} />}
                  disabled={exercises.length >= 60}
                  onPress={() => setPicking(true)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <SecondaryButton
                  full
                  label={t('editor.arrange')}
                  icon={<GripVertical size={17} color={theme.secondaryText} />}
                  disabled={exercises.length < 2}
                  onPress={() => setArranging(true)}
                />
              </View>
            </View>
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
                center
                label={t('editor.save')}
                icon={<Bookmark size={19} color={theme.primaryText} />}
                onPress={save}
              />
            </View>
          </Reveal>
        )}
      </Sheet>
      <Sheet
        open={!!menu}
        onClose={() => setMenu(null)}
        title={menu?.name ?? ''}
        description={menu?.muscle}
      >
        {menu && (
          <View style={{ gap: 8, marginTop: 16 }}>
            {[
              menu.supersetId
                ? {
                    key: 'unpair',
                    icon: <Unlink size={19} color={theme.secondaryText} />,
                    label: t('workout.leaveSuperset'),
                    onPress: () =>
                      setExercises(unpairFrom(exercises, keyOf, menu)),
                  }
                : {
                    key: 'pair',
                    icon: <Link2 size={19} color={theme.secondaryText} />,
                    label: t('workout.superset'),
                    hint: t('workout.supersetHint'),
                    disabled: exercises.length < 2,
                    onPress: () => setPairing(menu),
                  },
              {
                key: 'remove',
                icon: <Trash2 size={19} color={theme.danger} />,
                label: t('editor.remove', { name: menu.name }),
                danger: true,
                onPress: () =>
                  setExercises(
                    unpairFrom(exercises, keyOf, menu).filter(
                      (v) => v.key !== menu.key,
                    ),
                  ),
              },
            ].map((item, i) => (
              <Reveal key={item.key} y={8} duration={220} delay={i * 30}>
                <Press
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                  disabled={'disabled' in item && item.disabled}
                  scale={0.985}
                  onPress={() => {
                    setMenu(null);
                    item.onPress();
                  }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 14,
                    borderRadius: 14,
                    paddingVertical: 14,
                    paddingHorizontal: 14,
                    minHeight: 56,
                    backgroundColor: theme.soft,
                  }}
                >
                  {item.icon}
                  <View style={{ flex: 1 }}>
                    <T
                      weight={500}
                      size={14}
                      line={18}
                      color={
                        'danger' in item && item.danger
                          ? theme.danger
                          : theme.secondaryText
                      }
                    >
                      {item.label}
                    </T>
                    {'hint' in item && item.hint ? (
                      <Body size={12} style={{ marginTop: 2 }}>
                        {item.hint}
                      </Body>
                    ) : null}
                  </View>
                </Press>
              </Reveal>
            ))}
          </View>
        )}
      </Sheet>
      <ArrangeSheet
        open={arranging}
        exercises={items}
        onClose={() => setArranging(false)}
        onCommit={(keys) =>
          setExercises(keys.map((k) => exercises.find((e) => e.key === k)!))
        }
      />
      <PairSheet
        open={!!pairing}
        subject={
          pairing
            ? { key: pairing.key, name: pairing.name, muscle: pairing.muscle }
            : null
        }
        items={items}
        onClose={() => setPairing(null)}
        onPick={(key) => {
          const partner = exercises.find((e) => e.key === key);
          const subject = pairing;
          setPairing(null);
          if (subject && partner)
            setExercises(
              pairInto(exercises, keyOf, subject, partner, randomUUID),
            );
        }}
      />
    </>
  );
}
