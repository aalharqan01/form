import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Pedometer } from 'expo-sensors';
import { ArrowUpRight, Footprints, Plus } from 'lucide-react-native';
import {
  stepsAverage,
  stepsOn,
  today,
  type FitnessData,
} from '../../../lib/fitness';
import type { Training } from '../use-training';
import { useTheme } from '../theme';
import {
  Body,
  Card,
  Field,
  Input,
  PrimaryButton,
  SectionLabel,
  Sheet,
  T,
  TextButton,
} from '../ui';
import type { Act } from './shared';

/** Today's steps against the goal, with a sheet to log a count or set a goal. */
export function StepsCard({
  training,
  act,
  busy,
}: {
  training: Training;
  act: Act;
  busy: boolean;
}) {
  const { theme } = useTheme();
  const { data, update } = training;
  const coachGoal = training.detail?.member.nutrition?.steps ?? null;
  const goal = coachGoal ?? data.stepGoal ?? null;
  const date = today();
  const count = stepsOn(data, date);
  const week = stepsAverage(data.steps);
  const [modal, setModal] = useState<'log' | 'goal' | null>(null);
  const [value, setValue] = useState('');
  const [when, setWhen] = useState(date);
  const [formError, setFormError] = useState('');
  const [phone, setPhone] = useState<number | null>(null);
  const progress = goal && count !== null ? Math.min(1, count / goal) : 0;
  // On phones with a pedometer, offer today's count from the device (iOS keeps a week of history).
  useEffect(() => {
    if (modal !== 'log' || Platform.OS === 'web') return;
    let alive = true;
    (async () => {
      try {
        if (!(await Pedometer.isAvailableAsync())) return;
        const permission = await Pedometer.requestPermissionsAsync();
        if (!permission.granted) return;
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const result = await Pedometer.getStepCountAsync(start, new Date());
        if (alive) setPhone(result.steps);
      } catch {
        // No pedometer data: manual entry still works.
      }
    })();
    return () => {
      alive = false;
    };
  }, [modal]);
  const open = (kind: 'log' | 'goal') => {
    setFormError('');
    setWhen(date);
    setValue(
      kind === 'log'
        ? count === null
          ? ''
          : String(count)
        : goal
          ? String(goal)
          : '',
    );
    setModal(kind);
  };
  const save = () => {
    const n = Number(value.replace(/[^0-9]/g, ''));
    if (modal === 'goal') {
      if (!Number.isInteger(n) || n < 500 || n > 100000) {
        setFormError('Enter a daily goal between 500 and 100,000 steps.');
        return;
      }
      act(() => update((d) => ({ ...d, stepGoal: n })), 'Step goal saved.');
      setModal(null);
      return;
    }
    if (!value.trim() || !Number.isInteger(n) || n < 0 || n > 200000) {
      setFormError('Enter the steps for the day, up to 200,000.');
      return;
    }
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(when) ||
      Number.isNaN(Date.parse(when)) ||
      when > date
    ) {
      setFormError('Enter a date as YYYY-MM-DD, today or earlier.');
      return;
    }
    act(
      () =>
        update((d: FitnessData) => ({
          ...d,
          steps: [
            ...(d.steps ?? []).filter((e) => e.date !== when),
            { date: when, count: n },
          ].sort((a, b) => a.date.localeCompare(b.date)),
        })),
      'Steps saved.',
    );
    setModal(null);
  };
  return (
    <Card>
      <SectionLabel
        style={{ marginBottom: 16 }}
        right={
          <Footprints size={18} strokeWidth={1.4} color={theme.featureLabel} />
        }
      >
        STEPS
      </SectionLabel>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 9 }}>
        <T weight={500} size={45} line={48} tracking={-3.4}>
          {count === null ? '—' : count.toLocaleString()}
        </T>
        {goal ? (
          <T size={17} color={theme.placeholder}>
            / {goal.toLocaleString()}
          </T>
        ) : null}
      </View>
      <Body size={12}>
        {count === null
          ? 'Nothing logged today.'
          : goal
            ? progress >= 1
              ? 'Goal reached today.'
              : `${Math.round(progress * 100)}% of today’s goal`
            : 'Today'}
        {week.average !== null
          ? ` · ${week.average.toLocaleString()} avg over ${week.days} ${week.days === 1 ? 'day' : 'days'}`
          : ''}
      </Body>
      {goal ? (
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: goal, now: count ?? 0 }}
          style={{
            height: 6,
            borderRadius: 3,
            backgroundColor: theme.line,
            marginTop: 14,
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              width: `${Math.round(progress * 100)}%`,
              height: 6,
              borderRadius: 3,
              backgroundColor: theme.green,
            }}
          />
        </View>
      ) : null}
      <View
        style={{
          borderTopWidth: 1,
          borderColor: theme.line,
          marginTop: 12,
          paddingTop: 4,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <TextButton
          label="Log steps"
          size={13}
          onPress={() => open('log')}
          style={{ flex: 1, justifyContent: 'space-between', minHeight: 38 }}
        />
        {coachGoal ? (
          <Body size={12}>
            Goal from {training.detail?.member.coachName ?? 'your coach'}
          </Body>
        ) : (
          <TextButton
            label={goal ? 'Edit goal' : 'Set goal'}
            size={13}
            onPress={() => open('goal')}
          />
        )}
        <View style={{ pointerEvents: 'none' }}>
          <ArrowUpRight size={18} color={theme.textButton} />
        </View>
      </View>
      <Sheet
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === 'goal' ? 'Daily step goal' : 'Log steps'}
        description={
          modal === 'goal'
            ? 'A target for every day. Your coach’s target replaces it while you are coached.'
            : 'Enter the steps your phone or watch counted for the day.'
        }
      >
        <Field label={modal === 'goal' ? 'Steps per day' : 'Steps'}>
          <Input
            large
            accessibilityLabel={modal === 'goal' ? 'Steps per day' : 'Steps'}
            keyboardType="number-pad"
            inputMode="numeric"
            value={value}
            onChangeText={setValue}
            placeholder={modal === 'goal' ? '8000' : '7500'}
          />
        </Field>
        {modal === 'log' && phone !== null && (
          <TextButton
            label={`Use today’s count from this phone: ${phone.toLocaleString()}`}
            size={13}
            onPress={() => setValue(String(phone))}
          />
        )}
        {modal === 'log' && (
          <Field label="Date" hint="YYYY-MM-DD">
            <Input
              accessibilityLabel="Date"
              value={when}
              onChangeText={setWhen}
              maxLength={10}
              placeholder={date}
            />
          </Field>
        )}
        {!!formError && (
          <T
            size={13}
            line={18}
            color={theme.errorText}
            style={{ marginTop: 14 }}
            accessibilityRole="alert"
          >
            {formError}
          </T>
        )}
        <View style={{ marginTop: 22, gap: 6 }}>
          <PrimaryButton
            full
            label={modal === 'goal' ? 'Save goal' : 'Save steps'}
            icon={<Plus size={19} color={theme.primaryText} />}
            disabled={busy}
            onPress={save}
          />
          {modal === 'goal' && data.stepGoal != null && (
            <TextButton
              label="Remove goal"
              onPress={() => {
                act(() => update((d) => ({ ...d, stepGoal: null })));
                setModal(null);
              }}
            />
          )}
        </View>
      </Sheet>
    </Card>
  );
}
