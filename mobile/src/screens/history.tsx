import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { Check, Play, Share2, Trophy, X } from 'lucide-react-native';
import {
  completedSets,
  dateLabel,
  displayWeight,
  exerciseHistory,
  volume,
  type FitnessData,
  type Workout,
} from '../../../lib/fitness';
import type { Training } from '../use-training';
import { font, useTheme } from '../theme';
import {
  Body,
  DangerButton,
  H3,
  SecondaryButton,
  Segmented,
  Sheet,
  T,
  TextButton,
} from '../ui';
import { minutesOf, skippedSets, type Act } from './shared';

export function WorkoutDetailSheet({
  workout,
  unit,
  onClose,
  onRepeat,
  onDelete,
  onShare,
}: {
  workout: Workout | null;
  unit: 'kg' | 'lb';
  onClose: () => void;
  onRepeat: (workout: Workout) => void;
  onDelete: (workout: Workout) => void;
  onShare?: (workout: Workout) => void;
}) {
  const { theme } = useTheme();
  const [confirm, setConfirm] = useState(false);
  const w = workout;
  return (
    <>
      <Sheet
        open={!!w && !confirm}
        onClose={onClose}
        title={w?.name ?? ''}
        description={
          w
            ? `${dateLabel(w.startedAt, true)} · ${completedSets(w)} sets · ${volume(w).toLocaleString()} kg total volume${w.endedEarly ? ` · Finished early, ${skippedSets(w)} skipped` : ''}`
            : ''
        }
      >
        {w?.exercises.map((e) => (
          <View key={e.id} style={{ marginTop: 16 }}>
            <H3 size={16} style={{ marginBottom: 10 }}>
              {e.name}
            </H3>
            <View style={{ gap: 5 }}>
              {e.sets.map((s, i) => (
                <View
                  key={s.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 12,
                    backgroundColor: theme.soft,
                    borderRadius: 9,
                    paddingVertical: 9,
                    paddingHorizontal: 12,
                  }}
                >
                  <T
                    size={10}
                    line={14}
                    color={theme.placeholder}
                    style={{ minWidth: 13 }}
                  >
                    {i + 1}
                  </T>
                  <T
                    size={14}
                    line={18}
                    color={s.done ? theme.textButton : theme.muted}
                    style={{ flex: 1 }}
                  >
                    {s.done
                      ? `${displayWeight(Number(s.kg), e.unit ?? 'kg').toLocaleString(undefined, { maximumFractionDigits: 2 })} ${e.unit ?? 'kg'} × ${s.reps}${s.kind === 'warmup' ? ' · Warm-up' : ''}`
                      : `Skipped · ${s.reps || '—'} target reps`}
                  </T>
                  {s.done ? (
                    <Check size={14} color={theme.textButton} />
                  ) : (
                    <X size={14} color={theme.placeholder} />
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}
        {!!w?.notes && (
          <View
            style={{
              backgroundColor: theme.soft,
              padding: 13,
              borderRadius: 12,
              marginTop: 16,
            }}
          >
            <Body size={13} color={theme.ink}>
              {w.notes}
            </Body>
          </View>
        )}
        <View style={{ marginTop: 22, gap: 6 }}>
          <SecondaryButton
            full
            label="Repeat workout"
            icon={<Play size={16} color={theme.secondaryText} />}
            onPress={() => w && onRepeat(w)}
          />
          {onShare && (
            <SecondaryButton
              full
              label="Share workout"
              icon={<Share2 size={16} color={theme.secondaryText} />}
              onPress={() => w && onShare(w)}
            />
          )}
          <TextButton
            label="Delete workout"
            danger
            style={{ alignSelf: 'center' }}
            onPress={() => setConfirm(true)}
          />
        </View>
      </Sheet>
      <Sheet
        open={!!w && confirm}
        onClose={() => setConfirm(false)}
        title="Delete this workout?"
        description="This removes the session and all of its sets from your history."
      >
        <View style={{ marginTop: 18 }}>
          <DangerButton
            label="Delete workout"
            onPress={() => {
              setConfirm(false);
              if (w) onDelete(w);
            }}
          />
        </View>
      </Sheet>
    </>
  );
}

export function ExerciseProgressSheet({
  name,
  data,
  onClose,
}: {
  name: string | null;
  data: FitnessData;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const [metric, setMetric] = useState<'kg' | 'volume' | 'reps'>('kg');
  const svgFont = font(400).fontFamily;
  const points = name ? exerciseHistory(data.workouts, name) : [];
  const unit =
    data.workouts
      .flatMap((w) => w.exercises)
      .filter((e) => e.name === name)
      .at(-1)?.unit ?? 'kg';
  const value = (n: number) => (metric === 'reps' ? n : displayWeight(n, unit));
  const max = Math.max(1, ...points.map((p) => value(p[metric]))),
    min = Math.max(0, Math.min(...points.map((p) => value(p[metric]))) * 0.9);
  const x = (i: number) =>
      points.length < 2 ? 240 : 35 + (i / (points.length - 1)) * 440,
    y = (v: number) => 175 - ((value(v) - min) / (max - min || 1)) * 145;
  return (
    <Sheet
      wide
      open={!!name}
      onClose={onClose}
      title={name ?? ''}
      description="Best working-set load, reps at that load, and total working-set volume."
    >
      <View style={{ marginTop: 16 }}>
        <Segmented
          options={[
            { value: 'kg', label: 'Weight' },
            { value: 'reps', label: 'Reps' },
            { value: 'volume', label: 'Volume' },
          ]}
          value={metric}
          onChange={setMetric}
        />
      </View>
      <Svg
        width="100%"
        height={undefined}
        viewBox="0 0 510 215"
        style={{ aspectRatio: 510 / 215, marginVertical: 5 }}
        accessibilityLabel={`${metric} progress across ${points.length} workouts`}
      >
        <Line x1={35} x2={480} y1={178} y2={178} stroke={theme.line} />
        <Path
          d={points
            .map((p, i) => `${i ? 'L' : 'M'}${x(i)},${y(p[metric])}`)
            .join(' ')}
          fill="none"
          stroke={theme.green}
          strokeWidth={3}
        />
        {points.map((p, i) => (
          <Circle
            key={p.id}
            cx={x(i)}
            cy={y(p[metric])}
            r={4}
            fill={theme.green}
          />
        ))}
        <SvgText
          x={35}
          y={204}
          fontSize={12}
          fill={theme.muted}
          fontFamily={svgFont}
        >
          {points[0] ? dateLabel(points[0].date) : ''}
        </SvgText>
        <SvgText
          x={480}
          y={204}
          textAnchor="end"
          fontSize={12}
          fill={theme.muted}
          fontFamily={svgFont}
        >
          {points.at(-1) ? dateLabel(points.at(-1)!.date) : ''}
        </SvgText>
      </Svg>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: theme.deep,
          padding: 15,
          borderRadius: 13,
        }}
      >
        <Trophy size={20} color={theme.ink} />
        <T size={14} line={18} style={{ flex: 1 }}>
          Best load
        </T>
        <T weight={500} size={14} line={18}>
          {displayWeight(Math.max(0, ...points.map((p) => p.kg)), unit).toFixed(
            1,
          )}{' '}
          {unit}
        </T>
      </View>
      <View style={{ gap: 8, marginTop: 8 }}>
        {[...points].reverse().map((p) => (
          <View
            key={p.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 15,
              padding: 12,
              backgroundColor: theme.soft,
              borderRadius: 11,
            }}
          >
            <Body size={13} style={{ flex: 1 }}>
              {dateLabel(p.date)}
            </Body>
            <T weight={500} size={13} line={17}>
              {metric === 'reps'
                ? p.reps
                : displayWeight(p[metric], unit).toLocaleString(undefined, {
                    maximumFractionDigits: 1,
                  })}{' '}
              {metric === 'reps' ? 'reps' : unit}
            </T>
            {((metric === 'kg' && p.record) ||
              (metric === 'volume' && p.volumeRecord)) && (
              <View
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: 7,
                  borderRadius: 6,
                  backgroundColor: theme.prBadge,
                }}
              >
                <T size={10} line={12} color={theme.prBadgeText}>
                  PR
                </T>
              </View>
            )}
          </View>
        ))}
      </View>
    </Sheet>
  );
}
