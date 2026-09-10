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
  Geist_400Regular,
  Geist_500Medium,
  Geist_600SemiBold,
  Geist_700Bold,
} from '@expo-google-fonts/geist';
import { randomUUID } from 'expo-crypto';
import type { Routine, Workout } from '../lib/fitness';
import { routineFromWorkout } from '../lib/training';
import { useTraining } from './src/use-training';
import { useRest } from './src/use-rest';
import { ThemeProvider, markFontsReady, useTheme } from './src/theme';
import { Body, Card, ErrorBanner, H2, Notice, PrimaryButton, Reveal, SecondaryButton, T, TextButton } from './src/ui';
import { BottomNav, RestIsland, Topbar } from './src/shell';
import { TrainScreen } from './src/screens/train';
import { WorkoutScreen } from './src/screens/workout';
import { WeightScreen } from './src/screens/weight';
import { HistoryScreen } from './src/screens/history';
import { CoachScreen } from './src/screens/coach';
import { PreferencesSheet } from './src/screens/preferences';
import { duration, startWorkout, type Act, type Tab } from './src/screens/shared';

function AppContent() {
  const { theme } = useTheme();
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
        setError(e instanceof Error ? e.message : 'This change could not be saved.'),
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
      await training.update((d) => ({ ...d, active: startWorkout(d, routine, membershipId) }));
      navigate('train');
    });
  };
  const repeat = (workout: Workout) =>
    start(routineFromWorkout(workout, randomUUID(), workout.name));
  const syncError = error || training.error;
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: theme.background }}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: false,
          })}
        >
          <Topbar
            status={training.status}
            error={!!training.error}
            onRefresh={() => act(training.refresh)}
            onPreferences={() => setPreferences(true)}
          />
          <ErrorBanner text={syncError} onDismiss={error ? () => setError('') : undefined}>
            {!!training.error && (
              <SecondaryButton label="Retry" height={38} size={13} onPress={() => act(training.refresh)} />
            )}
          </ErrorBanner>
          <Notice text={notice} />
          {training.conflict && (
            <Card style={{ marginBottom: 18, gap: 12 }}>
              <H2 size={20}>Choose which changes to keep</H2>
              <Body size={14}>
                The same data changed on this device and on the server. A backup of this device’s log is
                kept before either choice.
              </Body>
              <SecondaryButton label="Keep this device’s changes" onPress={() => act(() => training.resolve(true))} />
              <TextButton label="Use the server’s changes" onPress={() => act(() => training.resolve(false))} />
            </Card>
          )}
          {!training.loaded ? (
            <View style={{ alignItems: 'center', justifyContent: 'center', minHeight: 420, gap: 20 }}>
              <T weight={500} size={60} line={64} tracking={-6} color={theme.scheme === 'dark' ? theme.green : '#7f985b'}>
                f.
              </T>
              <H2 size={23}>{training.error ? 'Your log is safe. Let’s reconnect.' : 'Loading your log…'}</H2>
              {training.error ? (
                <Body size={14}>Retry above to continue.</Body>
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
                <TrainScreen training={training} act={act} busy={busy} onStart={start} onRepeat={repeat} navigate={navigate} />
              ) : tab === 'weight' ? (
                <WeightScreen training={training} act={act} busy={busy} />
              ) : tab === 'history' ? (
                <HistoryScreen training={training} act={act} busy={busy} onStart={() => start(null)} onRepeat={repeat} />
              ) : (
                <CoachScreen training={training} act={act} busy={busy} onStart={start} />
              )}
            </Reveal>
          )}
        </ScrollView>
        {tab === 'train' && !!data.active && scrolled && (
          <Reveal y={-14} duration={220} style={{ position: 'absolute', top: 8, left: 18, right: 18 }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 12,
              paddingVertical: 8,
              paddingLeft: 18,
              paddingRight: 8,
              borderRadius: 24,
              backgroundColor: theme.navBackground,
              borderWidth: 1,
              borderColor: theme.navBorder,
              boxShadow: theme.scheme === 'dark' ? undefined : '0 8px 40px #23382016',
            }}
          >
            <View style={{ flex: 1, minWidth: 0 }}>
              <T weight={500} size={15} line={19} numberOfLines={1}>
                {data.active.name || 'Workout'}
              </T>
              <Body size={11}>{duration((rest.clock - Date.parse(data.active.startedAt)) / 1000)} elapsed</Body>
            </View>
            <PrimaryButton
              small
              label="Finish"
              accessibilityLabel="Finish this workout"
              icon={<Check size={17} color={theme.primaryText} />}
              disabled={busy}
              onPress={() => finishRef.current?.()}
            />
          </View>
          </Reveal>
        )}
        <RestIsland rest={rest} />
        <BottomNav tab={tab} onChange={navigate} activeWorkout={!!data.active} coached={coached} />
      </KeyboardAvoidingView>
      <PreferencesSheet open={preferences} onClose={() => setPreferences(false)} training={training} act={act} />
    </SafeAreaView>
  );
}

export default function App() {
  const [loaded, error] = useFonts({
    Geist_400Regular,
    Geist_500Medium,
    Geist_600SemiBold,
    Geist_700Bold,
  });
  markFontsReady(loaded);
  if (!loaded && !error) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
