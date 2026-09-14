import { useRef, useState } from 'react';
import { Animated, PanResponder, Platform, View } from 'react-native';
import { GripVertical } from 'lucide-react-native';
import { useTheme } from '../theme';
import { useI18n } from '../i18n';
import { Body, Press, Sheet, T, Thumbnail } from '../ui';

const native = Platform.OS !== 'web';

export type ArrangeItem = { key: string; name: string; muscle: string };

function ArrangeRow({
  exercise,
  shift,
  onStart,
  onMove,
  onEnd,
}: {
  exercise: ArrangeItem;
  shift: Animated.Value;
  onStart: () => void;
  onMove: (dy: number) => void;
  onEnd: (dy: number) => void;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const drag = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const [active, setActive] = useState(false);
  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setActive(true);
        onStart();
        Animated.spring(lift, {
          toValue: 1,
          damping: 16,
          stiffness: 260,
          useNativeDriver: native,
        }).start();
      },
      onPanResponderMove: (_, g) => {
        drag.setValue(g.dy);
        onMove(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        onEnd(g.dy);
        drag.setValue(0);
        setActive(false);
        Animated.spring(lift, {
          toValue: 0,
          damping: 16,
          stiffness: 260,
          useNativeDriver: native,
        }).start();
      },
      onPanResponderTerminate: () => {
        onEnd(0);
        drag.setValue(0);
        setActive(false);
        lift.setValue(0);
      },
    }),
  ).current;
  return (
    <Animated.View
      style={{
        zIndex: active ? 2 : 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        height: 64,
        marginBottom: 8,
        paddingStart: 10,
        paddingEnd: 4,
        borderRadius: 14,
        backgroundColor: theme.soft,
        boxShadow: active ? '0 12px 32px #23382026' : undefined,
        transform: [
          { translateY: active ? drag : shift },
          {
            scale: lift.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.03],
            }),
          },
        ],
      }}
    >
      <Thumbnail name={exercise.name} size={40} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T weight={500} size={14} line={18} numberOfLines={1}>
          {exercise.name}
        </T>
        <Body size={12}>{exercise.muscle}</Body>
      </View>
      <View
        {...responder.panHandlers}
        accessibilityRole="button"
        accessibilityLabel={t('workout.dragHandle', { name: exercise.name })}
        style={{
          width: 44,
          height: 64,
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <GripVertical size={20} color={theme.muted} />
      </View>
    </Animated.View>
  );
}

export function ArrangeSheet({
  open,
  exercises,
  onClose,
  onCommit,
}: {
  open: boolean;
  exercises: ArrangeItem[];
  onClose: () => void;
  onCommit: (keys: string[]) => void;
}) {
  const { t } = useI18n();
  const STEP = 72;
  const shifts = useRef(new Map<string, Animated.Value>()).current;
  const shiftFor = (id: string) => {
    let value = shifts.get(id);
    if (!value) {
      value = new Animated.Value(0);
      shifts.set(id, value);
    }
    return value;
  };
  const target = useRef<number | null>(null);
  const settleOthers = (from: number, to: number) => {
    exercises.forEach((e, j) => {
      const shift =
        j > from && j <= to ? -STEP : j < from && j >= to ? STEP : 0;
      Animated.spring(shiftFor(e.key), {
        toValue: shift,
        damping: 20,
        stiffness: 240,
        useNativeDriver: native,
      }).start();
    });
  };
  const slot = (from: number, dy: number) =>
    Math.max(0, Math.min(exercises.length - 1, Math.round(from + dy / STEP)));
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('workout.arrange')}
      description={t('workout.arrangeHint')}
    >
      <View style={{ marginTop: 16 }}>
        {exercises.map((exercise, index) => (
          <ArrangeRow
            key={exercise.key}
            exercise={exercise}
            shift={shiftFor(exercise.key)}
            onStart={() => {
              target.current = index;
            }}
            onMove={(dy) => {
              const to = slot(index, dy);
              if (to !== target.current) {
                target.current = to;
                settleOthers(index, to);
              }
            }}
            onEnd={(dy) => {
              const to = slot(index, dy);
              target.current = null;
              exercises.forEach((e) => shiftFor(e.key).setValue(0));
              if (to !== index) {
                const ids = exercises.map((e) => e.key);
                ids.splice(to, 0, ids.splice(index, 1)[0]);
                onCommit(ids);
              }
            }}
          />
        ))}
      </View>
    </Sheet>
  );
}

/** Pick the exercise to pair with `subject` as a superset. */
export function PairSheet({
  open,
  subject,
  items,
  onClose,
  onPick,
}: {
  open: boolean;
  subject: ArrangeItem | null;
  items: ArrangeItem[];
  onClose: () => void;
  onPick: (key: string) => void;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('workout.superset')}
      description={
        subject ? t('workout.supersetPick', { name: subject.name }) : ''
      }
    >
      {subject && (
        <View style={{ gap: 8, marginTop: 16 }}>
          {items
            .filter((e) => e.key !== subject.key)
            .map((e) => (
              <Press
                key={e.key}
                accessibilityRole="button"
                accessibilityLabel={e.name}
                scale={0.985}
                onPress={() => onPick(e.key)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  borderRadius: 14,
                  padding: 10,
                  backgroundColor: theme.soft,
                }}
              >
                <Thumbnail name={e.name} size={40} />
                <View style={{ flex: 1 }}>
                  <T weight={500} size={14} line={18}>
                    {e.name}
                  </T>
                  <Body size={12}>{e.muscle}</Body>
                </View>
              </Press>
            ))}
        </View>
      )}
    </Sheet>
  );
}

/** Letters supersets in order of first appearance. */
export function supersetLetters<T extends { supersetId?: string }>(list: T[]) {
  const letters = new Map<string, string>();
  for (const e of list)
    if (e.supersetId && !letters.has(e.supersetId))
      letters.set(e.supersetId, String.fromCharCode(65 + letters.size));
  return letters;
}

/** Pairs a and b in one superset and moves b right after a. */
export function pairInto<T extends { supersetId?: string }>(
  list: T[],
  keyOf: (item: T) => string,
  a: T,
  b: T,
  fresh: () => string,
): T[] {
  const supersetId = a.supersetId ?? b.supersetId ?? fresh();
  const tagged = list.map((e) =>
    keyOf(e) === keyOf(a) || keyOf(e) === keyOf(b) ? { ...e, supersetId } : e,
  );
  const partner = tagged.find((e) => keyOf(e) === keyOf(b))!;
  const rest = tagged.filter((e) => keyOf(e) !== keyOf(b));
  const anchor = rest.findIndex((e) => keyOf(e) === keyOf(a));
  rest.splice(anchor + 1, 0, partner);
  return rest;
}

/** Takes target out of its superset; a superset left with one member dissolves. */
export function unpairFrom<T extends { supersetId?: string }>(
  list: T[],
  keyOf: (item: T) => string,
  target: T,
): T[] {
  const left = list.filter(
    (e) => e.supersetId === target.supersetId && keyOf(e) !== keyOf(target),
  );
  return list.map((e) => {
    if (keyOf(e) === keyOf(target) || (left.length < 2 && left.includes(e))) {
      const { supersetId: _drop, ...rest } = e;
      return rest as T;
    }
    return e;
  });
}
