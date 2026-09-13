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
import { request } from '../api';
import type { Member } from '../../../lib/coaching';
import type { Training } from '../use-training';
import { useTheme } from '../theme';
import {
  Body,
  Card,
  Eyebrow,
  Field,
  H2,
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
  // A coached trainee shares one goal with the coach (either can change it);
  // an independent trainee keeps a personal goal in the log.
  const member = training.detail?.member ?? null;
  const shared = member?.status === 'active' ? member : null;
  const goal = shared ? shared.stepGoal : (data.stepGoal ?? null);
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
  const saveGoal = async (value: number | null) => {
    if (shared) {
      await request('/api/coaching', {
        action: 'step-goal',
        memberId: shared.id,
        stepGoal: value,
        revision: shared.revision,
      });
      await training.refreshCoach();
    } else await update((d) => ({ ...d, stepGoal: value }));
  };
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
      act(
        () => saveGoal(n),
        shared ? 'Step goal saved. Your coach can see it.' : 'Step goal saved.',
      );
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
        <TextButton
          label={goal ? 'Edit goal' : 'Set goal'}
          size={13}
          onPress={() => open('goal')}
        />
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
            ? shared
              ? `A target for every day, shared with ${shared.coachName}. Either of you can change it.`
              : 'A target for every day.'
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
          {modal === 'goal' && goal != null && (
            <TextButton
              label="Remove goal"
              onPress={() => {
                act(() => saveGoal(null));
                setModal(null);
              }}
            />
          )}
        </View>
      </Sheet>
    </Card>
  );
}

/** The shared step goal and last week's average, as shown under My coach. */
export function StepGoalCard({
  member,
}: {
  member: Pick<Member, 'stepGoal' | 'stats'>;
}) {
  const { theme } = useTheme();
  const average = member.stats?.stepsAverage ?? null;
  const days = member.stats?.stepsDays ?? 0;
  return (
    <Card style={{ marginTop: 14 }}>
      <Eyebrow size={12} color={theme.muted} style={{ marginBottom: 12 }}>
        DAILY STEPS
      </Eyebrow>
      <H2 size={22}>Step goal</H2>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 16,
          marginTop: 20,
        }}
      >
        {(
          [
            [
              member.stepGoal ? member.stepGoal.toLocaleString() : '—',
              member.stepGoal ? 'steps' : '',
              'Goal per day',
            ],
            [
              average === null ? '—' : average.toLocaleString(),
              average === null ? '' : 'steps',
              'Average · 7 days',
            ],
            [String(days), 'of 7', 'Days logged'],
          ] as const
        ).map(([value, unit, label]) => (
          <View key={label} style={{ minWidth: '40%', flex: 1 }}>
            <Body size={13}>{label}</Body>
            <T weight={500} size={26} line={30} tracking={-0.8}>
              {value}
              {unit ? (
                <T size={14} color={theme.muted}>
                  {' '}
                  {unit}
                </T>
              ) : null}
            </T>
          </View>
        ))}
      </View>
      <Body size={13} style={{ marginTop: 14 }}>
        {member.stepGoal
          ? 'Change the goal from the Steps card on the Train tab; your coach sees the change.'
          : 'Set a goal from the Steps card on the Train tab, or ask your coach.'}
      </Body>
    </Card>
  );
}
