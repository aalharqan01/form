import { View } from 'react-native';
import {
  dateLabel,
  type FitnessData,
  type Routine,
} from '../../../lib/fitness';
import {
  DAYS,
  weekOf,
  type NutritionTargets,
  type Program,
} from '../../../lib/coaching';
import type { Training } from '../use-training';
import { useTheme } from '../theme';
import { useI18n } from '../i18n';
import {
  Body,
  Card,
  Eyebrow,
  H2,
  H3,
  PrimaryButton,
  Row,
  T,
  Thumbnail,
} from '../ui';

export function ProgramNote({ text }: { text: string }) {
  const { theme } = useTheme();
  if (!text) return null;
  return (
    <View
      style={{
        backgroundColor: theme.soft,
        borderRadius: 16,
        padding: 20,
        marginTop: 10,
      }}
    >
      <Body size={15}>{text}</Body>
    </View>
  );
}

export function NutritionCard({
  targets,
}: {
  targets: NutritionTargets | null | undefined;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  return (
    <Card style={{ marginTop: 14 }}>
      <Eyebrow size={12} color={theme.muted} style={{ marginBottom: 12 }}>
        {t('assigned.nutritionEyebrow')}
      </Eyebrow>
      <H2 size={22}>{t('assigned.nutritionTitle')}</H2>
      {targets ? (
        <>
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
                [targets.calories, 'kcal', t('assigned.calories')],
                [targets.protein, 'g', t('assigned.protein')],
                [targets.carbs, 'g', t('assigned.carbs')],
                [targets.fat, 'g', t('assigned.fat')],
              ] as const
            ).map(([value, unit, label]) => (
              <View key={label} style={{ minWidth: '40%', flex: 1 }}>
                <Body size={13}>{label}</Body>
                <T weight={500} size={26} line={30} tracking={-0.8}>
                  {value}
                  <T size={14} color={theme.muted}>
                    {' '}
                    {unit}
                  </T>
                </T>
              </View>
            ))}
          </View>
          {!!targets.notes && <ProgramNote text={targets.notes} />}
        </>
      ) : (
        <Body size={14} style={{ marginTop: 10 }}>
          {t('assigned.noNutrition')}
        </Body>
      )}
    </Card>
  );
}

export function SessionCard({
  session,
  program,
  membershipId,
  fitness,
  busy,
  onStart,
}: {
  session: Program['sessions'][number];
  program: Program;
  membershipId: string;
  fitness: FitnessData;
  busy: boolean;
  onStart: (routine: Routine, membershipId: string) => void;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const today = new Date().toISOString().slice(0, 10);
  const completed = fitness.workouts.filter(
    (w) =>
      w.membershipId === membershipId &&
      w.programSessionId === session.id &&
      w.startedAt.slice(0, 10) >= weekOf() &&
      w.startedAt.slice(0, 10) <= today,
  ).length;
  const upcoming = program.startDate > today;
  return (
    <Card style={{ marginTop: 14 }}>
      <View style={{ gap: 6 }}>
        <Eyebrow size={12} color={theme.muted}>
          {DAYS[session.day].toUpperCase()}
          {completed ? ` · ${t('assigned.completedThisWeek')}` : ''}
        </Eyebrow>
        <H3 size={18}>{session.name}</H3>
        <Body size={13}>
          {session.exercises.length} exercises ·{' '}
          {session.exercises.reduce((n, e) => n + e.sets, 0)} sets
        </Body>
      </View>
      <View style={{ marginTop: 14 }}>
        <PrimaryButton
          small
          label={
            upcoming
              ? t('assigned.starts', { date: dateLabel(program.startDate) })
              : completed
                ? t('assigned.trainAgain')
                : t('assigned.startWorkout')
          }
          accessibilityLabel={t('assigned.startSession', {
            name: session.name,
          })}
          disabled={upcoming || busy}
          onPress={() => onStart(session, membershipId)}
        />
      </View>
      <View style={{ gap: 12, marginTop: 18 }}>
        {session.exercises.map((exercise, i) => (
          <Row key={i} gap={12}>
            <Thumbnail name={exercise.name} size={48} />
            <View style={{ flex: 1 }}>
              <T weight={500} size={15} line={20}>
                {exercise.name}
              </T>
              <Body size={12}>
                {exercise.sets} × {exercise.reps} reps
                {exercise.restSeconds !== undefined
                  ? ` · ${exercise.restSeconds ? exercise.restSeconds + 's rest' : 'no rest'}`
                  : ''}
              </Body>
            </View>
          </Row>
        ))}
      </View>
    </Card>
  );
}

export function AssignedWorkouts({
  training,
  busy,
  onStart,
}: {
  training: Training;
  busy: boolean;
  onStart: (routine: Routine, membershipId: string) => void;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const detail = training.detail;
  if (!detail) return null;
  const member = detail.member;
  return (
    <View style={{ marginBottom: 28 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <H2 size={22}>{t('assigned.title')}</H2>
        <Body size={13}>{t('assigned.thisWeek')}</Body>
      </Row>
      <Eyebrow size={12} color={theme.muted} style={{ marginTop: 18 }}>
        {member.coachName.toUpperCase()}
      </Eyebrow>
      {training.coachError ? (
        <Body size={13} style={{ marginTop: 8 }}>
          {training.coachError}
        </Body>
      ) : null}
      <NutritionCard targets={member.nutrition} />
      {!member.program ? (
        <Body size={14} style={{ marginTop: 16 }}>
          {t('assigned.preparing')}
        </Body>
      ) : (
        <>
          <H3 size={18} style={{ marginTop: 24 }}>
            {member.program.title}
          </H3>
          {member.program.sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              program={member.program!}
              membershipId={member.id}
              fitness={training.data}
              busy={busy}
              onStart={onStart}
            />
          ))}
        </>
      )}
    </View>
  );
}
