import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChartNoAxesCombined,
  CircleAlert,
  CloudCheck,
  Dumbbell,
  History,
  Settings2,
  Timer,
  Users,
  X,
} from 'lucide-react-native';
import type { Rest } from './use-rest';
import { useTheme } from './theme';
import { Press, T, easeOut } from './ui';
const native = Platform.OS !== 'web';
import { duration, type Tab } from './screens/shared';

export function Topbar({
  status,
  error,
  onRefresh,
  onPreferences,
}: {
  status: string;
  error: boolean;
  onRefresh: () => void;
  onPreferences: () => void;
}) {
  const { theme } = useTheme();
  const isDark = theme.scheme === 'dark';
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 28,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
        <T weight={600} size={32} line={34} tracking={-2.4} color={isDark ? theme.ink : '#233b26'}>
          form
        </T>
        <T weight={500} size={11} line={13} color={isDark ? theme.ink : '#233b26'} style={{ marginTop: 3, marginLeft: 2 }}>
          ®
        </T>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Refresh training data"
          onPress={onRefresh}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 36 }}
        >
          {error ? (
            <CircleAlert size={15} color={theme.danger} />
          ) : (
            <CloudCheck size={16} color={theme.muted} />
          )}
          <T size={10} line={13} color={error ? theme.danger : theme.muted}>
            {status}
          </T>
        </Pressable>
        <Press
          accessibilityRole="button"
          accessibilityLabel="Open preferences"
          onPress={onPreferences}
          scale={0.92}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: isDark ? theme.soft : '#e8eddf',
            borderWidth: 1,
            borderColor: isDark ? '#3d4d35' : '#dbe1d4',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Settings2 size={18} strokeWidth={1.5} color={isDark ? theme.ink : '#485e43'} />
        </Press>
      </View>
    </View>
  );
}

const TABS: { key: Tab; label: string; Icon: typeof Dumbbell }[] = [
  { key: 'train', label: 'Train', Icon: Dumbbell },
  { key: 'weight', label: 'Weight', Icon: ChartNoAxesCombined },
  { key: 'history', label: 'History', Icon: History },
  { key: 'coach', label: 'My coach', Icon: Users },
];
export function navInset(bottom: number) {
  return Math.max(14, bottom);
}
export function BottomNav({
  tab,
  onChange,
  activeWorkout,
  coached,
}: {
  tab: Tab;
  onChange: (tab: Tab) => void;
  activeWorkout: boolean;
  coached: boolean;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const tabs = coached ? TABS : TABS.filter((item) => item.key !== 'coach');
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel="Main navigation"
      style={{
        position: 'absolute',
        left: 18,
        right: 18,
        bottom: navInset(insets.bottom),
        flexDirection: 'row',
        padding: 6,
        borderRadius: 24,
        backgroundColor: theme.navBackground,
        borderWidth: 1,
        borderColor: theme.navBorder,
        boxShadow: theme.scheme === 'dark' ? undefined : '0 8px 40px #23382016',
      }}
    >
      {tabs.map(({ key, label, Icon }) => {
        const selected = tab === key;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected }}
            onPress={() => onChange(key)}
            style={{
              flex: 1,
              alignItems: 'center',
              gap: 5,
              paddingVertical: 10,
              borderRadius: 19,
              backgroundColor: selected ? theme.navSelected : 'transparent',
            }}
          >
            <View>
              <Icon size={20} strokeWidth={1.5} color={selected ? theme.green : theme.navText} />
              {key === 'train' && activeWorkout && (
                <View
                  style={{
                    position: 'absolute',
                    top: -2,
                    right: -6,
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: theme.green,
                  }}
                />
              )}
            </View>
            <T size={11} line={13} color={selected ? theme.green : theme.navText}>
              {label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function RestIsland({ rest }: { rest: Rest }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const finished = !!rest.end && rest.remaining === 0;
  const active = !!rest.end;
  const [shown, setShown] = useState(active);
  const progress = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    if (active) {
      setShown(true);
      Animated.timing(progress, { toValue: 1, duration: 260, easing: easeOut, useNativeDriver: native }).start();
    } else if (shown) {
      Animated.timing(progress, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: native,
      }).start(() => setShown(false));
    }
  }, [active, progress, shown]);
  useEffect(() => {
    if (!finished) return;
    const clear = setTimeout(rest.skip, 30000);
    return () => clearTimeout(clear);
  }, [finished, rest.skip]);
  if (!shown) return null;
  const adjust = (label: string, seconds: number) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${seconds < 0 ? 'Reduce' : 'Increase'} rest by 15 seconds`}
      onPress={() => rest.adjust(seconds)}
      style={{
        minHeight: 40,
        paddingVertical: 8,
        paddingHorizontal: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ffffff99',
        justifyContent: 'center',
      }}
    >
      <T size={14} line={18} color="#fff">
        {label}
      </T>
    </Pressable>
  );
  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: navInset(insets.bottom) + 84,
        opacity: progress,
        transform: [
          { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
          { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
        ],
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 17,
        borderRadius: 20,
        backgroundColor: finished ? theme.restDone : theme.rest,
        boxShadow: '0 10px 40px #23382030',
      }}
    >
      <Timer size={18} color={theme.restLabel} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <T size={11} line={14} tracking={0.4} color={theme.restLabel} numberOfLines={1}>
          {finished ? 'READY FOR YOUR NEXT SET' : 'REST TIMER'}
          {rest.name && !finished ? ` · ${rest.name.toUpperCase()}` : ''}
        </T>
        <T
          accessibilityLabel="Rest countdown"
          weight={500}
          size={finished ? 19 : 23}
          line={28}
          tracking={-0.9}
          color="#fff"
        >
          {finished ? 'Rest complete' : duration(rest.remaining)}
        </T>
      </View>
      {!finished && (
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {adjust('−15s', -15)}
          {adjust('+15s', 15)}
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Skip rest timer"
        onPress={rest.skip}
        hitSlop={8}
        style={{ width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }}
      >
        <X size={18} color="#bfd2b3" />
      </Pressable>
    </Animated.View>
  );
}
