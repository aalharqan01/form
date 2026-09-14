import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Animated,
  Easing,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  X,
} from 'lucide-react-native';
import imagePaths from '../../lib/exercise-images.json';
import { exerciseFrames } from '../../lib/exercises';
import { font, radius, useTheme, type Weight } from './theme';
import { SWITCH_OUT_MS, useI18n } from './i18n';
import { ExitLayer } from './sheet-exit';

import { API_ORIGIN } from './account';
export { API_ORIGIN };
export const native = Platform.OS !== 'web';
export const easeOut = Easing.bezier(0.23, 1, 0.32, 1);

/* ---------- Text ---------- */
type TProps = TextProps & {
  weight?: Weight;
  color?: string;
  size?: number;
  line?: number;
  tracking?: number;
  center?: boolean;
};
export function T({
  weight = 400,
  color,
  size = 16,
  line,
  tracking,
  center,
  style,
  ...rest
}: TProps) {
  const { theme } = useTheme();
  const { locale } = useI18n();
  // Arabic glyphs sit taller and never take negative tracking.
  const arabic = locale === 'ar';
  return (
    <Text
      {...rest}
      style={[
        font(weight),
        {
          fontSize: size,
          lineHeight: arabic
            ? Math.max(line ?? 0, Math.round(size * 1.5))
            : (line ?? Math.round(size * 1.35)),
          color: color ?? theme.ink,
          letterSpacing: arabic ? 0 : (tracking ?? 0),
          // On the web each Text guesses its direction from its first letter; the interface decides instead.
          writingDirection: arabic ? 'rtl' : 'ltr',
          textAlign: center ? 'center' : undefined,
        },
        style,
      ]}
    />
  );
}
export function Eyebrow({
  children,
  color,
  style,
  size = 11,
}: {
  children: ReactNode;
  color?: string;
  style?: StyleProp<TextStyle>;
  size?: number;
}) {
  const { theme } = useTheme();
  return (
    <T
      weight={600}
      size={size}
      line={size + 5}
      tracking={size * 0.16}
      color={color ?? theme.eyebrow}
      style={style}
    >
      {children}
    </T>
  );
}
export function PageHeading({
  eyebrow,
  first,
  second,
  right,
}: {
  eyebrow: string;
  first: string;
  second?: string;
  right?: ReactNode;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 24,
        flexWrap: 'wrap',
      }}
    >
      <View style={{ flexShrink: 1 }}>
        <Eyebrow style={{ marginBottom: 16 }}>{eyebrow}</Eyebrow>
        <T weight={500} size={38} line={41} tracking={-2.4}>
          {first}
          {second ? (
            <T
              weight={500}
              size={38}
              line={41}
              tracking={-2.4}
              color={theme.headingSpan}
            >
              {' '}
              {second}
            </T>
          ) : null}
        </T>
      </View>
      {right}
    </View>
  );
}
export function H2({
  children,
  style,
  size = 21,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  size?: number;
}) {
  return (
    <T
      weight={500}
      size={size}
      line={Math.round(size * 1.2)}
      tracking={-size * 0.04}
      style={style}
    >
      {children}
    </T>
  );
}
export function H3({
  children,
  style,
  size = 17,
}: {
  children: ReactNode;
  style?: StyleProp<TextStyle>;
  size?: number;
}) {
  return (
    <T
      weight={500}
      size={size}
      line={Math.round(size * 1.3)}
      tracking={-size * 0.025}
      style={style}
    >
      {children}
    </T>
  );
}
export function Body({ children, size = 14, style, color, ...rest }: TProps) {
  const { theme } = useTheme();
  return (
    <T
      size={size}
      line={Math.round(size * 1.6)}
      color={color ?? theme.muted}
      style={style}
      {...rest}
    >
      {children}
    </T>
  );
}

/* ---------- Mount transition ---------- */
export function Reveal({
  children,
  delay = 0,
  duration = 320,
  y = 12,
  style,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  y?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const animation = Animated.timing(value, {
      toValue: 1,
      duration,
      delay,
      easing: easeOut,
      useNativeDriver: native,
    });
    animation.start();
    return () => animation.stop();
  }, [value, delay, duration]);
  return (
    <Animated.View
      style={[
        style,
        {
          opacity: value,
          transform: [
            {
              translateY: value.interpolate({
                inputRange: [0, 1],
                outputRange: [y, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Two beats when the language changes: the current interface softens and
 * blurs for a moment, the text and direction switch underneath, and the new
 * interface settles in with an ease-out. One motion, not a jump. Also carries
 * the writing direction, which react-native-web reads from the nearest `dir`.
 */
export function LocaleCrossfade({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { locale, rtl, switching } = useI18n();
  const value = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (!switching) return;
    const animation = Animated.timing(value, {
      toValue: 0,
      duration: SWITCH_OUT_MS,
      easing: Easing.bezier(0.4, 0, 1, 1),
      useNativeDriver: native,
    });
    animation.start();
    return () => animation.stop();
  }, [switching, value]);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    value.setValue(0);
    const animation = Animated.timing(value, {
      toValue: 1,
      duration: 380,
      easing: easeOut,
      useNativeDriver: native,
    });
    animation.start();
    return () => animation.stop();
  }, [locale, value]);
  const direction = { dir: rtl ? 'rtl' : 'ltr' } as object;
  const blur =
    Platform.OS === 'web'
      ? ({
          filter: value.interpolate({
            inputRange: [0, 1],
            outputRange: ['blur(6px)', 'blur(0px)'],
          }),
        } as object)
      : null;
  return (
    <Animated.View
      {...direction}
      style={[
        style,
        {
          opacity: value.interpolate({
            inputRange: [0, 1],
            outputRange: [0.15, 1],
          }),
          transform: [
            {
              scale: value.interpolate({
                inputRange: [0, 1],
                outputRange: [0.97, 1],
              }),
            },
            {
              translateY: value.interpolate({
                inputRange: [0, 1],
                outputRange: [6, 0],
              }),
            },
          ],
        },
        blur,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/* ---------- Pressable with tactile feedback ---------- */
export function Press({
  children,
  style,
  scale = 0.97,
  disabled,
  ...props
}: Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  scale?: number;
  children?: ReactNode;
}) {
  const value = useRef(new Animated.Value(1)).current;
  const to = (target: number, duration: number) =>
    Animated.timing(value, {
      toValue: target,
      duration,
      easing: easeOut,
      useNativeDriver: native,
    }).start();
  return (
    <Pressable
      {...props}
      disabled={disabled}
      accessibilityState={{
        ...(props.accessibilityState ?? {}),
        disabled: !!disabled,
      }}
      onPressIn={(e) => {
        to(scale, 100);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        to(1, 160);
        props.onPressOut?.(e);
      }}
    >
      <Animated.View
        style={[
          style,
          { transform: [{ scale: value }], opacity: disabled ? 0.5 : 1 },
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

/** A chevron that points forward in the reading direction. */
export function Forward({
  size = 17,
  color,
}: {
  size?: number;
  color: string;
}) {
  const { rtl } = useI18n();
  const Icon = rtl ? ChevronLeft : ChevronRight;
  return <Icon size={size} color={color} />;
}

/* ---------- Buttons ---------- */
export function PrimaryButton({
  label,
  icon,
  onPress,
  disabled,
  full,
  small,
  center,
  accessibilityLabel,
}: {
  label: string;
  icon?: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  full?: boolean;
  small?: boolean;
  /** Centre the label; the icon keeps its place at the end. */
  center?: boolean;
  accessibilityLabel?: string;
}) {
  const { theme } = useTheme();
  const height = small ? 44 : 54;
  const orb = small ? 32 : 39;
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      disabled={disabled}
      style={{
        height,
        borderRadius: radius.pill,
        backgroundColor: theme.primaryButton,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: center ? 'center' : 'space-between',
        gap: small ? 8 : 24,
        // Centred labels get the same inset on both sides, so the label sits
        // in the middle of the button while the icon overlays the end.
        paddingStart: center && icon ? orb + 12 : small ? 15 : 22,
        paddingEnd:
          center && icon ? orb + 12 : icon ? (small ? 5 : 7) : small ? 15 : 22,
        alignSelf: full ? 'stretch' : 'flex-start',
      }}
    >
      <T weight={500} size={small ? 13 : 15} color={theme.primaryText}>
        {label}
      </T>
      {icon ? (
        <View
          style={{
            width: orb,
            height: orb,
            borderRadius: 20,
            backgroundColor: theme.orb,
            alignItems: 'center',
            justifyContent: 'center',
            ...(center
              ? { position: 'absolute' as const, end: small ? 5 : 7 }
              : {}),
          }}
        >
          {icon}
        </View>
      ) : null}
    </Press>
  );
}
export function SecondaryButton({
  label,
  icon,
  onPress,
  disabled,
  full,
  accessibilityLabel,
  background,
  color,
  height = 45,
  size = 14,
}: {
  label: string;
  icon?: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  full?: boolean;
  accessibilityLabel?: string;
  background?: string;
  color?: string;
  height?: number;
  size?: number;
}) {
  const { theme } = useTheme();
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      disabled={disabled}
      style={{
        height,
        borderRadius: radius.pill,
        backgroundColor: background ?? theme.secondaryButton,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingHorizontal: 19,
        alignSelf: full ? 'stretch' : 'flex-start',
      }}
    >
      {icon}
      <T weight={500} size={size} color={color ?? theme.secondaryText}>
        {label}
      </T>
    </Press>
  );
}
export function TextButton({
  label,
  icon,
  onPress,
  disabled,
  danger,
  accessibilityLabel,
  size = 14,
  style,
}: {
  label: string;
  icon?: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
  accessibilityLabel?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      disabled={disabled}
      scale={0.96}
      style={[
        {
          minHeight: 44,
          paddingVertical: 6,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          alignSelf: 'flex-start',
        },
        style,
      ]}
    >
      {icon}
      <T
        weight={500}
        size={size}
        color={danger ? theme.dangerText : theme.textButton}
      >
        {label}
      </T>
    </Press>
  );
}
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  disabled,
  size = 44,
  background,
}: {
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  disabled?: boolean;
  size?: number;
  background?: string;
}) {
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      scale={0.9}
      style={{
        width: size,
        height: size,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: background,
      }}
    >
      {icon}
    </Press>
  );
}
export function DangerButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      style={{
        height: 48,
        borderRadius: radius.pill,
        backgroundColor: theme.danger,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        alignSelf: 'flex-start',
      }}
    >
      <T weight={500} size={14} color="#fff">
        {label}
      </T>
    </Press>
  );
}

/* ---------- Layout ---------- */
export function Bezel({
  children,
  style,
  tight,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  tight?: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          padding: tight ? 4 : 5,
          backgroundColor: theme.bezel,
          borderRadius: tight ? 23 : radius.bezel,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function Card({
  children,
  style,
  background,
  padding = 24,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  background?: string;
  padding?: number;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          padding,
          backgroundColor: background ?? theme.surface,
          borderRadius: radius.card,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
export function SectionLabel({
  children,
  right,
  color,
  style,
}: {
  children: ReactNode;
  right?: ReactNode;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        },
        style,
      ]}
    >
      <T
        weight={600}
        size={11}
        line={16}
        tracking={1.4}
        color={color ?? theme.featureLabel}
      >
        {children}
      </T>
      {right}
    </View>
  );
}
export function SectionTitle({
  title,
  count,
  right,
  style,
}: {
  title: string;
  count?: number;
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          marginTop: 23,
          marginBottom: 15,
        },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          flexShrink: 1,
        }}
      >
        <H2>{title}</H2>
        {count !== undefined && (
          <View
            style={{
              width: 23,
              height: 23,
              borderRadius: 12,
              backgroundColor: theme.summary,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <T size={11} line={13} color={theme.routineMarkText}>
              {count}
            </T>
          </View>
        )}
      </View>
      {right}
    </View>
  );
}
export function Row({
  children,
  style,
  gap = 12,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  gap?: number;
}) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>
      {children}
    </View>
  );
}
export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  const { theme } = useTheme();
  return <View style={[{ height: 1, backgroundColor: theme.line }, style]} />;
}

/* ---------- Inputs ---------- */
export function Input({
  large,
  style,
  ...props
}: TextInputProps & { large?: boolean }) {
  const { theme } = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.placeholder}
      {...props}
      style={[
        font(large ? 500 : 400),
        {
          minHeight: large ? 88 : 49,
          borderRadius: radius.field,
          backgroundColor: theme.input,
          borderWidth: 1,
          borderColor: theme.inputBorder,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: large ? 44 : 16,
          color: theme.inputText,
          textAlign: large ? 'center' : undefined,
          letterSpacing: large ? -2 : 0,
        },
        props.multiline ? { minHeight: 92, textAlignVertical: 'top' } : null,
        style,
      ]}
    />
  );
}
export function Field({
  label,
  hint,
  children,
  style,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  return (
    <View style={[{ gap: 8, marginTop: 18 }, style]}>
      <T
        weight={500}
        size={13}
        color={theme.scheme === 'dark' ? theme.ink : '#52634b'}
      >
        {label}
        {hint ? (
          <T size={12} color={theme.placeholder}>
            {'  '}
            {hint}
          </T>
        ) : null}
      </T>
      {children}
    </View>
  );
}
export function Segmented<V extends string | number>({
  options,
  value,
  onChange,
  accessibilityLabel,
  compact,
  scroll,
  labelFor,
  style,
}: {
  options: { value: V; label: string }[];
  value: V;
  onChange: (value: V) => void;
  accessibilityLabel?: string;
  compact?: boolean;
  scroll?: boolean;
  labelFor?: (option: { value: V; label: string }) => string;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const isDark = theme.scheme === 'dark';
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[
        {
          flexDirection: 'row',
          gap: compact ? 0 : 3,
          padding: compact ? 3 : 4,
          borderRadius: compact ? 30 : 11,
          backgroundColor: compact ? theme.secondaryButton : theme.soft,
          alignSelf: compact || scroll ? 'flex-start' : 'stretch',
        },
        style,
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Press
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityLabel={labelFor ? labelFor(option) : option.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            scale={0.96}
            style={{
              flex: compact || scroll ? undefined : 1,
              minWidth: compact ? 34 : undefined,
              minHeight: compact ? 30 : scroll ? 40 : 34,
              paddingHorizontal: compact ? 10 : scroll ? 14 : 5,
              paddingVertical: 7,
              borderRadius: compact ? 30 : 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: selected
                ? isDark
                  ? '#42513b'
                  : theme.surface
                : 'transparent',
              boxShadow:
                selected && !isDark ? '0 2px 5px #23382010' : undefined,
            }}
          >
            <T
              weight={selected ? 500 : 400}
              size={compact ? 11 : scroll ? 13 : 12}
              line={16}
              numberOfLines={1}
              color={
                selected ? (isDark ? theme.ink : '#3b5534') : theme.chipText
              }
            >
              {option.label}
            </T>
          </Press>
        );
      })}
    </View>
  );
}
export function Chip({
  label,
  selected,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const { theme } = useTheme();
  return (
    <Press
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: !!selected }}
      onPress={onPress}
      scale={0.95}
      style={{
        paddingHorizontal: 12,
        minHeight: 34,
        justifyContent: 'center',
        borderRadius: 20,
        backgroundColor: selected ? '#41673c' : theme.chip,
      }}
    >
      <T size={12} line={16} color={selected ? '#fff' : theme.chipText}>
        {label}
      </T>
    </Press>
  );
}

/* ---------- Feedback ---------- */
export function ErrorBanner({
  text,
  onDismiss,
  children,
}: {
  text: string;
  onDismiss?: () => void;
  children?: ReactNode;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  if (!text) return null;
  return (
    <Reveal y={-8} duration={220}>
      <View
        accessibilityRole="alert"
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          gap: 10,
          padding: 14,
          borderRadius: 15,
          backgroundColor: theme.errorBackground,
          marginBottom: 18,
          flexWrap: 'wrap',
        }}
      >
        <T
          size={13}
          line={19}
          color={theme.errorText}
          style={{ flex: 1, minWidth: 160 }}
        >
          {text}
        </T>
        {children}
        {onDismiss && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('ui.dismiss')}
            onPress={onDismiss}
            hitSlop={8}
          >
            <X size={17} color={theme.errorText} />
          </Pressable>
        )}
      </View>
    </Reveal>
  );
}
export function Notice({ text }: { text: string }) {
  const { theme } = useTheme();
  if (!text) return null;
  return (
    <Reveal y={-8} duration={220}>
      <View
        accessibilityLiveRegion="polite"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          padding: 12,
          paddingHorizontal: 16,
          borderRadius: 13,
          backgroundColor: theme.navSelected,
          marginBottom: 18,
        }}
      >
        <Check size={16} color={theme.green} />
        <T size={13} line={18} color={theme.green} style={{ flex: 1 }}>
          {text}
        </T>
      </View>
    </Reveal>
  );
}

/* ---------- Tiles ---------- */
export function DateTile({ iso, size = 44 }: { iso: string; size?: number }) {
  const { theme } = useTheme();
  const date = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  return (
    <View
      style={{
        width: size,
        height: size + 4,
        borderRadius: 12,
        backgroundColor: theme.dateTile,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <T
        weight={500}
        size={21}
        line={24}
        tracking={-0.7}
        color={theme.dateTileText}
      >
        {date.getDate()}
      </T>
      <T size={10} line={12} tracking={0.4} color={theme.dateTileText}>
        {date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
      </T>
    </View>
  );
}
export function Thumbnail({
  name,
  size = 56,
}: {
  name: string;
  size?: number;
}) {
  const { theme } = useTheme();
  const path = (imagePaths as Record<string, string>)[name];
  const frame = path ? null : exerciseFrames(name)[0];
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{
        width: size,
        height: size,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: path || frame ? '#fff' : theme.soft,
        borderWidth: 1,
        borderColor: theme.line,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {path ? (
        <Image
          source={{ uri: API_ORIGIN + path }}
          resizeMode="contain"
          style={{ width: size - 6, height: size - 6 }}
        />
      ) : frame ? (
        <Image
          source={{ uri: frame }}
          resizeMode="cover"
          style={{ width: size, height: size }}
        />
      ) : (
        <Dumbbell
          size={Math.round(size * 0.43)}
          strokeWidth={1.4}
          color={theme.muted}
        />
      )}
    </View>
  );
}
export function Credits() {
  const { theme } = useTheme();
  const link = (label: string, url: string) => (
    <T
      size={12}
      line={19}
      color={theme.muted}
      style={{ textDecorationLine: 'underline' }}
      onPress={() => void Linking.openURL(url)}
    >
      {label}
    </T>
  );
  return (
    <T size={12} line={19} color={theme.muted} style={{ marginVertical: 12 }}>
      Illustrations:{' '}
      {link('Everkinetic / Greg Priday', 'https://github.com/everkinetic/data')}{' '}
      ·{' '}
      {link('CC BY-SA 4.0', 'https://creativecommons.org/licenses/by-sa/4.0/')}
    </T>
  );
}

/* ---------- Sheet (dialog) ---------- */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  wide?: boolean;
}) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const [visible, setVisible] = useState(open);
  const [closing, setClosing] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (open) {
      setClosing(false);
      setVisible(true);
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 220,
        easing: easeOut,
        useNativeDriver: native,
      }).start();
    } else if (visible) {
      // A short exit, then unmount: the modal's focus trap must not linger
      // over the page behind it.
      setClosing(true);
      Animated.timing(progress, {
        toValue: 0,
        duration: 150,
        easing: Easing.out(Easing.quad),
        useNativeDriver: native,
      }).start(({ finished }) => {
        if (!finished) return;
        setClosing(false);
        setVisible(false);
      });
    }
  }, [open, progress, visible]);
  if (!visible) return null;
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1],
  });
  const body = (
    <Animated.View
      pointerEvents={closing ? 'none' : 'auto'}
      style={{
        flex: 1,
        backgroundColor: theme.scrim,
        opacity: progress,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('ui.closeDialog')}
        onPress={onClose}
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          padding: 12,
          pointerEvents: 'box-none',
        }}
      >
        <Animated.View
          accessibilityViewIsModal
          style={{
            width: '100%',
            maxWidth: wide ? 550 : 460,
            maxHeight: '94%',
            borderRadius: radius.sheet,
            borderWidth: 4,
            borderColor: theme.dialogBorder,
            backgroundColor: theme.dialog,
            transform: [
              { scale },
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
            boxShadow: '0 24px 90px #20391b22',
            overflow: 'hidden',
          }}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 23, paddingTop: 26, gap: 4 }}
          >
            <LocaleCrossfade style={{ gap: 4 }}>
              <View style={{ paddingEnd: 36 }}>
                <T weight={500} size={25} line={29} tracking={-1.25}>
                  {title}
                </T>
                {description ? (
                  typeof description === 'string' ? (
                    <Body size={13} style={{ marginTop: 10 }}>
                      {description}
                    </Body>
                  ) : (
                    <View style={{ marginTop: 10 }}>{description}</View>
                  )
                ) : null}
              </View>
              {children}
            </LocaleCrossfade>
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('ui.close')}
            onPress={onClose}
            hitSlop={6}
            style={{
              position: 'absolute',
              top: 8,
              end: 8,
              width: 36,
              height: 36,
              borderRadius: 18,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} color={theme.muted} />
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
  // The exit plays outside the modal so its focus trap is gone at once.
  if (closing) return <ExitLayer>{body}</ExitLayer>;
  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      {body}
    </Modal>
  );
}
export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  style,
}: {
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={style}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={{ minHeight: 44, justifyContent: 'center' }}
      >
        <T size={13} line={18} color={theme.muted}>
          {open ? '▾' : '▸'} {summary}
        </T>
      </Pressable>
      {open && children}
    </View>
  );
}
