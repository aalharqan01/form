import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  ClipboardList,
  Minus,
} from 'lucide-react-native';
import { dateLabel, type Routine } from '../../../lib/fitness';
import { memberStatus, weekOf, type Checkin } from '../../../lib/coaching';
import { request } from '../api';
import type { Training } from '../use-training';
import { useTheme } from '../theme';
import { useI18n } from '../i18n';
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
import { StepGoalCard } from './steps';
import { ConversationScreen } from './conversation';
import type { Act } from './shared';

import { USER_KEY as USER } from '../account';
type CoachTab = 'overview' | 'program' | 'checkins' | 'messages';

function WeeklyChange({ value }: { value: number | null | undefined }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  if (value == null)
    return (
      <T
        weight={500}
        size={26}
        line={34}
        tracking={-1}
        color={theme.muted}
        accessibilityLabel={t('mycoach.noCompare')}
      >
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
        accessibilityLabel={t('mycoach.vsLastWeek', {
          change: flat
            ? t('mycoach.noChange')
            : t(value > 0 ? 'mycoach.gain' : 'mycoach.loss', {
                amount: Math.abs(value).toFixed(1),
              }),
        })}
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

const STATUS_KEYS = {
  invited: 'status.invited',
  requested: 'status.requested',
  awaiting_payment: 'status.awaitingPayment',
  rejected: 'status.rejected',
  withdrawn: 'status.withdrawn',
  active: 'status.active',
  ended: 'status.ended',
} as const;

const ENERGY_KEYS = [
  'mycoach.energy1',
  'mycoach.energy2',
  'mycoach.energy3',
  'mycoach.energy4',
  'mycoach.energy5',
] as const;

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
        {
          flex: 1,
          minWidth: '45%',
          backgroundColor: accent ? theme.primaryButton : theme.surface,
          borderRadius: 22,
          padding: 18,
          gap: 8,
        },
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
  const { t } = useI18n();
  return (
    <Card style={{ gap: 6 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
        }}
      >
        <H2 size={20}>{t('mycoach.weekOf', { date: dateLabel(item.week) })}</H2>
        <Badge
          text={
            item.reviewed_at ? t('mycoach.reviewed') : t('mycoach.awaiting')
          }
          amber={!item.reviewed_at}
        />
      </View>
      <View style={{ flexDirection: 'row', gap: 32, marginTop: 14 }}>
        <View>
          <Body size={13}>{t('mycoach.energy')}</Body>
          <T weight={500} size={22} line={26}>
            {item.answers.energy}/5
          </T>
        </View>
        <View>
          <Body size={13}>{t('mycoach.sleep')}</Body>
          <T weight={500} size={22} line={26}>
            {t('mycoach.hours', { count: item.answers.sleep })}
          </T>
        </View>
      </View>
      <H3 size={15} style={{ marginTop: 16 }}>
        {t('mycoach.wins')}
      </H3>
      <Body size={15} color={theme.ink}>
        {item.answers.wins || t('mycoach.noNotes')}
      </Body>
      <H3 size={15} style={{ marginTop: 12 }}>
        {t('mycoach.challenges')}
      </H3>
      <Body size={15} color={theme.ink}>
        {item.answers.challenges || t('mycoach.noNotes')}
      </Body>
      {item.reviewed_at ? (
        <View
          style={{
            backgroundColor: theme.soft,
            borderRadius: 14,
            padding: 16,
            marginTop: 14,
            gap: 6,
          }}
        >
          <T weight={500} size={14} line={18}>
            {t('mycoach.coachReply')}
          </T>
          <Body size={15} color={theme.ink}>
            {item.feedback}
          </Body>
        </View>
      ) : (
        <Body size={13} style={{ marginTop: 12 }}>
          {t('mycoach.willReview')}
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
  const { t } = useI18n();
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
      void request('/api/coaching', {
        action: 'read',
        memberId,
        through: lastMessage,
      }).catch(() => {});
  }, [tab, memberId, lastMessage]);
  if (!detail) {
    return (
      <>
        <Eyebrow size={12} color={theme.muted} style={{ marginBottom: 18 }}>
          {t('mycoach.eyebrow')}
        </Eyebrow>
        <T
          weight={500}
          size={34}
          line={38}
          tracking={-1.9}
          style={{ marginBottom: 14 }}
        >
          {t('mycoach.heading')}
        </T>
        <Body size={16} style={{ marginBottom: 28 }}>
          {t('mycoach.intro')}
        </Body>
        <Card style={{ alignItems: 'center', paddingVertical: 56, gap: 16 }}>
          <ClipboardList size={40} strokeWidth={1.3} color={theme.green} />
          <H2 size={24}>{t('mycoach.find')}</H2>
          <Body size={15} center style={{ maxWidth: 320 }}>
            {training.coachError || t('mycoach.findBody')}
          </Body>
          {!!training.coachError && (
            <SecondaryButton
              label={t('mycoach.retry')}
              onPress={() => act(training.refreshCoach)}
            />
          )}
        </Card>
      </>
    );
  }
  const m = detail.member;
  const thisWeek = detail.checkins.some((c) => c.week === weekOf());
  const tabs: { value: CoachTab; label: string }[] = [
    { value: 'overview', label: t('mycoach.overview') },
    { value: 'program', label: t('mycoach.program') },
    { value: 'checkins', label: t('mycoach.checkins') },
    {
      value: 'messages',
      label: m.unread
        ? t('mycoach.messagesUnread', { count: m.unread })
        : t('mycoach.messages'),
    },
  ];
  return (
    <>
      <View style={{ paddingTop: 4, paddingBottom: 24, gap: 12 }}>
        <Eyebrow size={12} color={theme.muted}>
          {t('mycoach.yourCoach')}
        </Eyebrow>
        <T weight={500} size={34} line={38} tracking={-1.9}>
          {m.coachName}
        </T>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            flexWrap: 'wrap',
          }}
        >
          <Body size={16}>{m.offer.name}</Body>
          <Badge text={t(STATUS_KEYS[m.status]) || memberStatus(m.status)} />
        </View>
      </View>
      {!!training.coachError && (
        <Body size={13} style={{ marginBottom: 16 }}>
          {training.coachError}
        </Body>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 24 }}
      >
        <Segmented scroll options={tabs} value={tab} onChange={setTab} />
      </ScrollView>
      {tab === 'overview' && (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            <Metric
              label={t('mycoach.workouts7')}
              value={String(m.stats?.workouts ?? 0)}
              small={
                m.stats?.lastWorkout
                  ? t('mycoach.lastSession', {
                      date: dateLabel(m.stats.lastWorkout),
                    })
                  : t('mycoach.noWorkouts')
              }
            />
            <Metric
              accent
              label={t('mycoach.scheduled')}
              value={String(m.stats?.completed ?? 0)}
              suffix={`/${m.stats?.due ?? 0}`}
              small={t('mycoach.scheduledNote')}
            />
            <View
              style={{
                minWidth: '100%',
                backgroundColor: theme.surface,
                borderRadius: 22,
                padding: 18,
                gap: 14,
              }}
            >
              <T size={13} line={17} color={theme.muted}>
                {t('mycoach.weeklyAverage')}
              </T>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-end',
                  gap: 22,
                  flexWrap: 'wrap',
                }}
              >
                <View style={{ gap: 2 }}>
                  <T weight={500} size={30} line={34} tracking={-1.4}>
                    {m.stats?.averageKg?.toFixed(1) ?? '—'}
                    <T size={14} color={theme.muted}>
                      {' '}
                      kg
                    </T>
                  </T>
                  <T size={11} line={15} color={theme.muted}>
                    {t('mycoach.weighInsWeek', {
                      count: m.stats?.weightCount ?? 0,
                    })}
                  </T>
                </View>
                <View style={{ gap: 2 }}>
                  <WeeklyChange value={m.stats?.averageChangeKg} />
                  <T size={11} line={15} color={theme.muted}>
                    {t('mycoach.vsLast')}
                  </T>
                </View>
              </View>
            </View>
          </View>
          <NutritionCard targets={m.nutrition} />
          <StepGoalCard member={m} />
          <Card style={{ marginTop: 14 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <H2 size={22}>{t('mycoach.weeklyCheckin')}</H2>
              <ClipboardList size={21} strokeWidth={1.5} color={theme.muted} />
            </View>
            <Body size={15} style={{ marginTop: 12, marginBottom: 18 }}>
              {thisWeek ? t('mycoach.submitted') : t('mycoach.shareWeek')}
            </Body>
            <SecondaryButton
              label={t('mycoach.openCheckin')}
              icon={<ChevronRight size={17} color={theme.secondaryText} />}
              onPress={() => setTab('checkins')}
            />
            <Divider style={{ marginVertical: 22 }} />
            <H3 size={16}>{t('mycoach.currentProgram')}</H3>
            <Body size={15} style={{ marginTop: 8 }}>
              {m.program?.title ?? t('mycoach.noProgram')}
            </Body>
            <TextButton
              label={t('mycoach.viewProgram')}
              icon={<ChevronRight size={16} color={theme.textButton} />}
              onPress={() => setTab('program')}
            />
          </Card>
          <Card style={{ marginTop: 14 }}>
            <H2 size={22}>{t('mycoach.intake')}</H2>
            <View style={{ marginTop: 6 }}>
              {(
                [
                  [t('mycoach.goals'), m.intake.goals],
                  [t('mycoach.experience'), m.intake.experience],
                  [t('mycoach.equipment'), m.intake.equipment],
                  [
                    t('mycoach.considerations'),
                    m.intake.limitations || t('mycoach.noneShared'),
                  ],
                  [
                    t('mycoach.availability'),
                    t('mycoach.daysPerWeek', {
                      count: m.intake.days,
                      country:
                        m.intake.country === 'QA'
                          ? t('mycoach.qatar')
                          : t('mycoach.saudi'),
                    }),
                  ],
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
            <H2 size={22}>{t('mycoach.yourProgram')}</H2>
            <Body size={15} style={{ marginTop: 10 }}>
              {t('mycoach.preparing')}
            </Body>
          </Card>
        ) : (
          <>
            <H2 size={24}>{m.program.title}</H2>
            <Body size={13} style={{ marginTop: 6 }}>
              {t('mycoach.starts', {
                date: dateLabel(m.program.startDate, true),
                count: m.program.sessions.length,
                noun:
                  m.program.sessions.length === 1
                    ? t('mycoach.session')
                    : t('mycoach.sessions'),
              })}
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
              <Eyebrow
                size={12}
                color={theme.muted}
                style={{ marginBottom: 12 }}
              >
                {t('mycoach.weekOfEyebrow', {
                  date: dateLabel(weekOf()).toUpperCase(),
                })}
              </Eyebrow>
              <H2 size={22}>{t('mycoach.yourCheckin')}</H2>
              <Field label={t('mycoach.energyWeek')}>
                <Segmented
                  accessibilityLabel={t('mycoach.energyWeek')}
                  options={[1, 2, 3, 4, 5].map((n) => ({
                    value: n,
                    label: String(n),
                  }))}
                  labelFor={(o) => t('mycoach.energyOf', { value: o.value })}
                  value={energy}
                  onChange={setEnergy}
                />
                <Body size={12}>{t(ENERGY_KEYS[energy - 1])}</Body>
              </Field>
              <Field label={t('mycoach.sleepHours')}>
                <Input
                  accessibilityLabel={t('mycoach.sleepHours')}
                  keyboardType="decimal-pad"
                  inputMode="decimal"
                  value={sleep}
                  onChangeText={setSleep}
                  maxLength={4}
                />
              </Field>
              <Field label={t('mycoach.wentWell')}>
                <Input
                  accessibilityLabel={t('mycoach.wentWell')}
                  multiline
                  maxLength={2000}
                  value={wins}
                  onChangeText={setWins}
                />
              </Field>
              <Field label={t('mycoach.askCoach')}>
                <Input
                  accessibilityLabel={t('mycoach.askCoach')}
                  multiline
                  maxLength={2000}
                  value={challenges}
                  onChangeText={setChallenges}
                />
              </Field>
              <View style={{ marginTop: 22 }}>
                <PrimaryButton
                  label={busy ? t('mycoach.sending') : t('mycoach.submit')}
                  accessibilityLabel={t('mycoach.submit')}
                  icon={<Check size={18} color={theme.primaryText} />}
                  disabled={busy}
                  onPress={() =>
                    act(async () => {
                      const hours = Number(sleep);
                      if (!Number.isFinite(hours) || hours < 0 || hours > 24)
                        throw new Error(
                          'Enter average sleep between 0 and 24 hours.',
                        );
                      await request('/api/coaching', {
                        action: 'checkin',
                        memberId: m.id,
                        answers: { energy, sleep: hours, wins, challenges },
                      });
                      setWins('');
                      setChallenges('');
                      await training.refreshCoach();
                    }, t('mycoach.sent'))
                  }
                />
              </View>
            </Card>
          )}
          {detail.checkins.map((c) => (
            <CheckinCard key={c.id} item={c} />
          ))}
          {!detail.checkins.length && thisWeek && (
            <Body size={14}>{t('mycoach.collected')}</Body>
          )}
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
