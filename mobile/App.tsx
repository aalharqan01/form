import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import {
  Outfit_400Regular,
  Outfit_500Medium,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import { LocaleProvider, useI18n } from './src/i18n';
import { randomUUID } from 'expo-crypto';
import type { Routine, Workout } from '../lib/fitness';
import { routineFromWorkout } from '../lib/training';
import { useTraining } from './src/use-training';
import { useRest } from './src/use-rest';
import { ThemeProvider, markFontsReady, useTheme } from './src/theme';
import {
  Body,
  Card,
  ErrorBanner,
  H2,
  Notice,
  PrimaryButton,
  Reveal,
  SecondaryButton,
  T,
  TextButton,
} from './src/ui';
import { BottomNav, RestIsland, Topbar } from './src/shell';
import { easeOut, native } from './src/ui';
import { TrainScreen } from './src/screens/train';
import { WorkoutScreen } from './src/screens/workout';
import { WeightScreen } from './src/screens/weight';
import { YouScreen } from './src/screens/you';
import { CoachScreen } from './src/screens/coach';
import { PreferencesSheet } from './src/screens/preferences';
import {
  duration,
  startWorkout,
  type Act,
  type Tab,
} from './src/screens/shared';

function AppContent() {
  const { theme } = useTheme();
  const { t, locale, rtl } = useI18n();
  const training = useTraining();
  const { data } = training;
  const rest = useRest(data.active?.id);
  const [tab, setTab] = useState<Tab>('train');
  const [pending, setPending] = useState(0),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [preferences, setPreferences] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const finishRef = useRef<(() => void) | null>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const id = scrollY.addListener(({ value }) => setScrolled(value > 120));
    return () => scrollY.removeListener(id);
  }, [scrollY]);
  const navigate = (next: Tab) => {
    setTab(next);
    scroll.current?.scrollTo({ y: 0, animated: false });
    setNotice('');
    setError('');
  };
  const act: Act = (action, message) => {
    setPending((n) => n + 1);
    setError('');
    void action()
      .then(() => {
        if (message) setNotice(message);
      })
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : t('app.saveFailed')),
      )
      .finally(() => setPending((n) => n - 1));
  };
  const busy = pending > 0 || training.conflict;
  // The coaching tab exists only while a website-purchased membership is active.
  const coached = !!training.detail;
  useEffect(() => {
    if (tab === 'coach' && training.loaded && !coached) setTab('train');
  }, [tab, coached, training.loaded]);
  const start = (routine: Routine | null, membershipId?: string) => {
    if (data.active) {
      navigate('train');
      return;
    }
    act(async () => {
      await training.update((d) => ({
        ...d,
        active: startWorkout(d, routine, membershipId),
      }));
      navigate('train');
    });
  };
  const repeat = (workout: Workout) =>
    start(routineFromWorkout(workout, randomUUID(), workout.name));
  const syncError = error || training.error;
  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={{ flex: 1, backgroundColor: theme.background }}
    >
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <LocaleCrossfade locale={locale} rtl={rtl}>
          <ScrollView
            ref={scroll}
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 23,
              paddingBottom: 150,
              width: '100%',
              maxWidth: 600,
              alignSelf: 'center',
            }}
            keyboardShouldPersistTaps="handled"
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              {
                useNativeDriver: false,
              },
            )}
          >
            <Topbar
              status={training.status}
              error={!!training.error}
              onRefresh={() => act(training.refresh)}
              onPreferences={() => setPreferences(true)}
            />
            <ErrorBanner
              text={syncError}
              onDismiss={error ? () => setError('') : undefined}
            >
              {!!training.error && (
                <SecondaryButton
                  label={t('app.retry')}
                  height={38}
                  size={13}
                  onPress={() => act(training.refresh)}
                />
              )}
            </ErrorBanner>
            <Notice text={notice} />
            {training.conflict && (
              <Card style={{ marginBottom: 18, gap: 12 }}>
                <H2 size={20}>{t('app.conflictTitle')}</H2>
                <Body size={14}>{t('app.conflictBody')}</Body>
                <SecondaryButton
                  label={t('app.keepDevice')}
                  onPress={() => act(() => training.resolve(true))}
                />
                <TextButton
                  label={t('app.useServer')}
                  onPress={() => act(() => training.resolve(false))}
                />
              </Card>
            )}
            {!training.loaded ? (
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 420,
                  gap: 20,
                }}
              >
                <T
                  weight={500}
                  size={60}
                  line={64}
                  tracking={-6}
                  color={theme.scheme === 'dark' ? theme.green : '#7f985b'}
                >
                  f.
                </T>
                <H2 size={23}>
                  {training.error ? t('app.reconnect') : t('app.loading')}
                </H2>
                {training.error ? (
                  <Body size={14}>{t('app.retryHint')}</Body>
                ) : (
                  <ActivityIndicator color={theme.green} />
                )}
              </View>
            ) : (
              <Reveal key={`${tab}-${data.active ? 'active' : 'idle'}`}>
                {tab === 'train' && data.active ? (
                  <WorkoutScreen
                    training={training}
                    rest={rest}
                    act={act}
                    busy={busy}
                    onFinished={() => navigate('train')}
                    finishRef={finishRef}
                  />
                ) : tab === 'train' ? (
                  <TrainScreen
                    training={training}
                    act={act}
                    busy={busy}
                    onStart={start}
                    onRepeat={repeat}
                    navigate={navigate}
                  />
                ) : tab === 'weight' ? (
                  <WeightScreen training={training} act={act} busy={busy} />
                ) : tab === 'you' ? (
                  <YouScreen
                    training={training}
                    act={act}
                    busy={busy}
                    onStart={() => start(null)}
                    onRepeat={repeat}
                  />
                ) : (
                  <CoachScreen
                    training={training}
                    act={act}
                    busy={busy}
                    onStart={start}
                    scrollToEnd={() =>
                      scroll.current?.scrollToEnd({ animated: false })
                    }
                  />
                )}
              </Reveal>
            )}
          </ScrollView>
          {tab === 'train' && !!data.active && scrolled && (
            <Reveal
              y={-14}
              duration={220}
              style={{ position: 'absolute', top: 8, left: 18, right: 18 }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingVertical: 8,
                  paddingStart: 18,
                  paddingEnd: 8,
                  borderRadius: 24,
                  backgroundColor: theme.navBackground,
                  borderWidth: 1,
                  borderColor: theme.navBorder,
                  boxShadow:
                    theme.scheme === 'dark'
                      ? undefined
                      : '0 8px 40px #23382016',
                }}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T weight={500} size={15} line={19} numberOfLines={1}>
                    {data.active.name || t('workout.defaultName')}
                  </T>
                  <Body size={11}>
                    {duration(
                      (rest.clock - Date.parse(data.active.startedAt)) / 1000,
                    )}{' '}
                    {t('app.elapsed')}
                  </Body>
                </View>
                <PrimaryButton
                  small
                  label={t('app.finish')}
                  accessibilityLabel={t('app.finishThis')}
                  icon={<Check size={17} color={theme.primaryText} />}
                  disabled={busy}
                  onPress={() => finishRef.current?.()}
                />
              </View>
            </Reveal>
          )}
          <RestIsland rest={rest} />
          <BottomNav
            tab={tab}
            onChange={navigate}
            activeWorkout={!!data.active}
            coached={coached}
          />
        </LocaleCrossfade>
      </KeyboardAvoidingView>
      <PreferencesSheet
        open={preferences}
        onClose={() => setPreferences(false)}
        training={training}
        act={act}
      />
    </SafeAreaView>
  );
}

/** Fades the interface in again when the language changes, so the switch reads as one motion rather than a jump. */
function LocaleCrossfade({
  locale,
  rtl,
  children,
}: {
  locale: string;
  rtl: boolean;
  children: React.ReactNode;
}) {
  const value = useRef(new Animated.Value(1)).current;
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    value.setValue(0);
    const animation = Animated.timing(value, {
      toValue: 1,
      duration: 260,
      easing: easeOut,
      useNativeDriver: native,
    });
    animation.start();
    return () => animation.stop();
  }, [locale, value]);
  // react-native-web resolves start/end styles from the nearest `dir`, not the document.
  const direction = { dir: rtl ? 'rtl' : 'ltr' } as object;
  return (
    <Animated.View
      {...direction}
      style={{
        flex: 1,
        opacity: value.interpolate({
          inputRange: [0, 1],
          outputRange: [0.35, 1],
        }),
        transform: [
          {
            scale: value.interpolate({
              inputRange: [0, 1],
              outputRange: [0.985, 1],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

export default function App() {
  const [loaded, error] = useFonts({
    Outfit_400Regular,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });
  markFontsReady(loaded);
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LocaleProvider>
          <AppContent />
        </LocaleProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
