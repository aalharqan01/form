import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ArrowDownRight, ArrowUpRight, Check, ChevronRight, ClipboardList, Minus } from 'lucide-react-native';
import { dateLabel, type Routine } from '../../../lib/fitness';
import { memberStatus, weekOf, type Checkin } from '../../../lib/coaching';
import { request } from '../api';
import type { Training } from '../use-training';
import { useTheme } from '../theme';
import {
  Body,
  Card,

  Eyebrow,
  Field,
  Divider,
  H2,
  H3,
  Input,
  PrimaryButton,
  SecondaryButton,
  Segmented,
  T,
  TextButton,
} from '../ui';
import { NutritionCard, ProgramNote, SessionCard } from './assigned';
import { ConversationScreen } from './conversation';
import type { Act } from './shared';

import { USER_KEY as USER } from '../account';
type CoachTab = 'overview' | 'program' | 'checkins' | 'messages';

function WeeklyChange({ value }: { value: number | null | undefined }) {
  const { theme } = useTheme();
  if (value == null)
    return (
      <T weight={500} size={26} line={34} tracking={-1} color={theme.muted} accessibilityLabel="No previous week to compare">
        —
      </T>
    );
  const flat = Math.abs(value) < 0.05;
  const color = flat ? theme.muted : value > 0 ? theme.amberText : theme.green;
  const Icon = flat ? Minus : value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Icon size={18} color={color} />
      <T
        weight={500}
        size={26}
        line={34}
        tracking={-1}
        color={color}
        accessibilityLabel={`${flat ? 'No change' : `${Math.abs(value).toFixed(1)} kg ${value > 0 ? 'gain' : 'loss'}`} vs last week's average`}
      >
        {flat ? '0.0' : Math.abs(value).toFixed(1)}
        <T size={14} color={theme.muted}>
          {' '}
          kg
        </T>
      </T>
    </View>
  );
}

function Badge({ text, amber }: { text: string; amber?: boolean }) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 7,
        backgroundColor: amber ? theme.amber : theme.soft,
        alignSelf: 'flex-start',
      }}
    >
      <T size={12} line={15} color={amber ? theme.amberText : theme.green}>
        {text}
      </T>
    </View>
  );
}

function Metric({
  label,
  value,
  small,
  accent,
  suffix,
  style,
  children,
}: {
  label: string;
  value: string;
  small: string;
  accent?: boolean;
  suffix?: string;
  style?: object;
  children?: React.ReactNode;
}) {
  const { theme } = useTheme();
  const color = accent ? theme.primaryText : theme.ink;
  return (
    <View
      style={[
        { flex: 1, minWidth: '45%', backgroundColor: accent ? theme.primaryButton : theme.surface, borderRadius: 22, padding: 18, gap: 8 },
        style,
      ]}
    >
      <T size={13} line={17} color={accent ? theme.primaryText : theme.muted}>
        {label}
      </T>
      <T weight={500} size={30} line={34} tracking={-1.4} color={color}>
        {value}
        {suffix ? (
          <T size={14} color={accent ? theme.primaryText : theme.muted}>
            {suffix}
          </T>
        ) : null}
      </T>
      <T size={11} line={15} color={accent ? theme.primaryText : theme.muted}>
        {small}
      </T>
      {children}
    </View>
  );
}

function CheckinCard({ item }: { item: Checkin }) {
  const { theme } = useTheme();
  return (
    <Card style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <H2 size={20}>Week of {dateLabel(item.week)}</H2>
        <Badge text={item.reviewed_at ? 'Reviewed' : 'Awaiting review'} amber={!item.reviewed_at} />
      </View>
      <View style={{ flexDirection: 'row', gap: 32, marginTop: 14 }}>
        <View>
          <Body size={13}>Energy</Body>
          <T weight={500} size={22} line={26}>
            {item.answers.energy}/5
          </T>
        </View>
        <View>
          <Body size={13}>Sleep</Body>
          <T weight={500} size={22} line={26}>
            {item.answers.sleep} hours
          </T>
        </View>
      </View>
      <H3 size={15} style={{ marginTop: 16 }}>
        Wins
      </H3>
      <Body size={15} color={theme.ink}>
        {item.answers.wins || 'No notes'}
      </Body>
      <H3 size={15} style={{ marginTop: 12 }}>
        Challenges & questions
      </H3>
      <Body size={15} color={theme.ink}>
        {item.answers.challenges || 'No notes'}
      </Body>
      {item.reviewed_at ? (
        <View style={{ backgroundColor: theme.soft, borderRadius: 14, padding: 16, marginTop: 14, gap: 6 }}>
          <T weight={500} size={14} line={18}>
            Coach feedback
          </T>
          <Body size={15} color={theme.ink}>
            {item.feedback}
          </Body>
        </View>
      ) : (
        <Body size={13} style={{ marginTop: 12 }}>
          Your coach will review this update.
        </Body>
      )}
    </Card>
  );
}

export function CoachScreen({
  training,
  act,
  busy,
  onStart,
  scrollToEnd,
}: {
  training: Training;
  act: Act;
  busy: boolean;
  onStart: (routine: Routine, membershipId: string) => void;
  scrollToEnd: () => void;
}) {
  const { theme } = useTheme();
  const detail = training.detail;
  const [tab, setTab] = useState<CoachTab>('overview');
  const [energy, setEnergy] = useState(3),
    [sleep, setSleep] = useState('7'),
    [wins, setWins] = useState(''),
    [challenges, setChallenges] = useState('');
  const memberId = detail?.member.id;
  const lastMessage = detail?.messages.at(-1)?.created_at;
  useEffect(() => {
    if (tab === 'messages' && memberId && lastMessage)
      void request('/api/coaching', { action: 'read', memberId, through: lastMessage }).catch(() => {});
  }, [tab, memberId, lastMessage]);
  if (!detail) {
    return (
      <>
        <Eyebrow size={12} color={theme.muted} style={{ marginBottom: 18 }}>
          YOUR COACHING
        </Eyebrow>
        <T weight={500} size={34} line={38} tracking={-1.9} style={{ marginBottom: 14 }}>
          My coach.
        </T>
        <Body size={16} style={{ marginBottom: 28 }}>
          Your membership, program and conversations.
        </Body>
        <Card style={{ alignItems: 'center', paddingVertical: 56, gap: 16 }}>
          <ClipboardList size={40} strokeWidth={1.3} color={theme.green} />
          <H2 size={24}>Find your coach</H2>
          <Body size={15} center style={{ maxWidth: 320 }}>
            {training.coachError ||
              'Browse coaches and packages on the Form website. An active membership appears here with your program, check-ins and messages.'}
          </Body>
          {!!training.coachError && (
            <SecondaryButton label="Retry" onPress={() => act(training.refreshCoach)} />
          )}
        </Card>
      </>
    );
  }
  const m = detail.member;
  const thisWeek = detail.checkins.some((c) => c.week === weekOf());
  const tabs: { value: CoachTab; label: string }[] = [
    { value: 'overview', label: 'Overview' },
    { value: 'program', label: 'Program' },
    { value: 'checkins', label: 'Check-ins' },
    { value: 'messages', label: m.unread ? `Messages · ${m.unread}` : 'Messages' },
  ];
  return (
    <>
      <View style={{ paddingTop: 4, paddingBottom: 24, gap: 12 }}>
        <Eyebrow size={12} color={theme.muted}>
          YOUR COACH
        </Eyebrow>
        <T weight={500} size={34} line={38} tracking={-1.9}>
          {m.coachName}
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <Body size={16}>{m.offer.name}</Body>
          <Badge text={memberStatus(m.status)} />
        </View>
      </View>
      {!!training.coachError && (
        <Body size={13} style={{ marginBottom: 16 }}>
          {training.coachError}
        </Body>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 24 }}>
        <Segmented scroll options={tabs} value={tab} onChange={setTab} />
      </ScrollView>
      {tab === 'overview' && (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Metric
              label="Workouts · last 7 days"
              value={String(m.stats?.workouts ?? 0)}
              small={m.stats?.lastWorkout ? 'Last session ' + dateLabel(m.stats.lastWorkout) : 'No completed workouts yet'}
            />
            <Metric
              accent
              label="Scheduled sessions"
              value={String(m.stats?.completed ?? 0)}
              suffix={`/${m.stats?.due ?? 0}`}
              small="Completed · last 7 calendar days (UTC)"
            />
            <View style={{ minWidth: '100%', backgroundColor: theme.surface, borderRadius: 22, padding: 18, gap: 14 }}>
              <T size={13} line={17} color={theme.muted}>
                Weekly average weight
              </T>
              <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 22, flexWrap: 'wrap' }}>
                <View style={{ gap: 2 }}>
                  <T weight={500} size={30} line={34} tracking={-1.4}>
                    {m.stats?.averageKg?.toFixed(1) ?? '—'}
                    <T size={14} color={theme.muted}>
                      {' '}
                      kg
                    </T>
                  </T>
                  <T size={11} line={15} color={theme.muted}>
                    {m.stats?.weightCount ?? 0} weigh-ins this week
                  </T>
                </View>
                <View style={{ gap: 2 }}>
                  <WeeklyChange value={m.stats?.averageChangeKg} />
                  <T size={11} line={15} color={theme.muted}>
                    vs last week’s average
                  </T>
                </View>
              </View>
            </View>
          </View>
          <NutritionCard targets={m.nutrition} />
          <Card style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <H2 size={22}>Weekly check-in</H2>
              <ClipboardList size={21} strokeWidth={1.5} color={theme.muted} />
            </View>
            <Body size={15} style={{ marginTop: 12, marginBottom: 18 }}>
              {thisWeek ? 'This week’s check-in has been submitted.' : 'Share how training has felt this week.'}
            </Body>
            <SecondaryButton
              label="Open check-in"
              icon={<ChevronRight size={17} color={theme.secondaryText} />}
              onPress={() => setTab('checkins')}
            />
            <Divider style={{ marginVertical: 22 }} />
            <H3 size={16}>Current program</H3>
            <Body size={15} style={{ marginTop: 8 }}>
              {m.program?.title ?? 'No program assigned yet.'}
            </Body>
            <TextButton
              label="View program"
              icon={<ChevronRight size={16} color={theme.textButton} />}
              onPress={() => setTab('program')}
            />
          </Card>
          <Card style={{ marginTop: 14 }}>
            <H2 size={22}>Intake</H2>
            <View style={{ marginTop: 6 }}>
              {(
                [
                  ['Goals', m.intake.goals],
                  ['Training experience', m.intake.experience],
                  ['Equipment', m.intake.equipment],
                  ['Considerations', m.intake.limitations || 'None shared'],
                  ['Availability', `${m.intake.days} days/week · ${m.intake.country === 'QA' ? 'Qatar' : 'Saudi Arabia'}`],
                ] as const
              ).map(([label, value]) => (
                <View key={label} style={{ marginTop: 16 }}>
                  <Body size={13}>{label}</Body>
                  <T size={16} line={22} style={{ marginTop: 4 }}>
                    {value}
                  </T>
                </View>
              ))}
            </View>
          </Card>
        </>
      )}
      {tab === 'program' &&
        (!m.program ? (
          <Card>
            <H2 size={22}>Your program</H2>
            <Body size={15} style={{ marginTop: 10 }}>
              Your coach is preparing your program. Assigned sessions also appear in Train.
            </Body>
          </Card>
        ) : (
          <>
            <H2 size={24}>{m.program.title}</H2>
            <Body size={13} style={{ marginTop: 6 }}>
              Starts {dateLabel(m.program.startDate, true)} · {m.program.sessions.length}{' '}
              {m.program.sessions.length === 1 ? 'session' : 'sessions'} per week
            </Body>
            <ProgramNote text={m.program.notes} />
            {m.program.sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                program={m.program!}
                membershipId={m.id}
                fitness={training.data}
                busy={busy}
                onStart={onStart}
              />
            ))}
          </>
        ))}
      {tab === 'checkins' && (
        <View style={{ gap: 20 }}>
          {!thisWeek && (
            <Card>
              <Eyebrow size={12} color={theme.muted} style={{ marginBottom: 12 }}>
                WEEK OF {dateLabel(weekOf()).toUpperCase()}
              </Eyebrow>
              <H2 size={22}>Your weekly check-in</H2>
              <Field label="Energy this week">
                <Segmented
                  accessibilityLabel="Energy this week"
                  options={['Very low', 'Low', 'Okay', 'Good', 'Great'].map((label, i) => ({ value: i + 1, label: String(i + 1) }))}
                  labelFor={(o) => `Energy ${o.value} of 5`}
                  value={energy}
                  onChange={setEnergy}
                />
                <Body size={12}>{['Very low', 'Low', 'Okay', 'Good', 'Great'][energy - 1]}</Body>
              </Field>
              <Field label="Average sleep (hours)">
                <Input accessibilityLabel="Average sleep (hours)" keyboardType="decimal-pad" inputMode="decimal" value={sleep} onChangeText={setSleep} maxLength={4} />
              </Field>
              <Field label="What went well?">
                <Input accessibilityLabel="What went well?" multiline maxLength={2000} value={wins} onChangeText={setWins} />
              </Field>
              <Field label="Challenges or questions for your coach">
                <Input accessibilityLabel="Challenges or questions for your coach" multiline maxLength={2000} value={challenges} onChangeText={setChallenges} />
              </Field>
              <View style={{ marginTop: 22 }}>
                <PrimaryButton
                  label={busy ? 'Sending…' : 'Submit check-in'}
                  accessibilityLabel="Submit check-in"
                  icon={<Check size={18} color={theme.primaryText} />}
                  disabled={busy}
                  onPress={() =>
                    act(async () => {
                      const hours = Number(sleep);
                      if (!Number.isFinite(hours) || hours < 0 || hours > 24)
                        throw new Error('Enter average sleep between 0 and 24 hours.');
                      await request('/api/coaching', {
                        action: 'checkin',
                        memberId: m.id,
                        answers: { energy, sleep: hours, wins, challenges },
                      });
                      setWins('');
                      setChallenges('');
                      await training.refreshCoach();
                    }, 'Check-in sent to your coach.')
                  }
                />
              </View>
            </Card>
          )}
          {detail.checkins.map((c) => (
            <CheckinCard key={c.id} item={c} />
          ))}
          {!detail.checkins.length && thisWeek && <Body size={14}>Your check-ins will be collected here.</Body>}
        </View>
      )}
      {tab === 'messages' && (
        <ConversationScreen
          training={training}
          detail={detail}
          act={act}
          busy={busy}
          onThreadReady={scrollToEnd}
        />
      )}
    </>
  );
}
