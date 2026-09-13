import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme, type TextStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Tokens mirror app/globals.css so the native app reads as the same product.
export const light = {
  scheme: 'light' as 'light' | 'dark',
  background: '#f6f7f4',
  ink: '#172921',
  green: '#245b3e',
  muted: '#68756c',
  line: '#e1e6df',
  surface: '#ffffff',
  soft: '#edf2e7',
  deep: '#e4ebd7',
  bezel: '#eaeee6',
  headingSpan: '#7c897e',
  eyebrow: '#596b5a',
  textButton: '#3f6443',
  feature: '#e6edcf',
  featureText: '#5f6f51',
  featureLabel: '#627151',
  featurePill: '#dce6be',
  featureSymbol: '#59752e',
  goal: '#eaf0db',
  goalButton: '#dce6c8',
  goalText: '#798868',
  summary: '#e9eedf',
  metrics: '#ebefe4',
  addExercise: '#e6edda',
  navBackground: '#ffffffec',
  navBorder: '#ffffff',
  navSelected: '#e8eedf',
  navText: '#6b786c',
  primaryButton: '#245b3e',
  primaryText: '#ffffff',
  orb: '#ffffff24',
  secondaryButton: '#edf1e7',
  secondaryText: '#37533c',
  chip: '#edf0e8',
  chipText: '#768370',
  trained: '#28593d',
  routineMark: '#f1f3ec',
  routineMarkText: '#7d8d6d',
  dateTile: '#f0f3e9',
  dateTileText: '#647b51',
  setInput: '#f1f4ed',
  setInputText: '#4d653e',
  setDone: '#e9f1df',
  setDoneText: '#376029',
  checkIdle: '#eef2e9',
  checkIdleText: '#b5c1a9',
  checkDone: '#396b3b',
  stepperBar: '#e4ebd7',
  warmup: '#f2e9d6',
  warmupText: '#946a36',
  rest: '#244f34',
  restDone: '#3a633a',
  restLabel: '#b2c8a4',
  danger: '#a54d3c',
  dangerText: '#a37162',
  errorBackground: '#f8eae3',
  errorText: '#943e2f',
  prBadge: '#e7dec0',
  prBadgeText: '#725f2b',
  amber: '#c9831114',
  amberText: '#8d620f',
  sparkline: '#709246',
  trendLine: '#456f36',
  dailyLine: '#b8c5ae',
  dot: '#9cad8b',
  grid: '#e8ece3',
  axis: '#788578',
  dialog: '#fbfcf9',
  dialogBorder: '#edf0e8',
  input: '#ffffff',
  inputBorder: '#dfe6d8',
  inputText: '#294327',
  placeholder: '#94a088',
  scrim: '#17292166',
  message: '#edf2e7',
  mine: '#245b3e',
  mineText: '#f6f7f4',
};
export type Theme = typeof light;
export const dark: Theme = {
  ...light,
  scheme: 'dark',
  background: '#131a16',
  ink: '#e4ecdf',
  green: '#91b373',
  muted: '#a4b39c',
  line: '#303c31',
  surface: '#1d271f',
  soft: '#29372a',
  deep: '#354530',
  bezel: '#293528',
  headingSpan: '#8c9c88',
  eyebrow: '#a4b39c',
  textButton: '#c0d3ac',
  feature: '#33432c',
  featureText: '#c4d4b4',
  featureLabel: '#c4d4b4',
  featurePill: '#3f5236',
  featureSymbol: '#9db781',
  goal: '#33432c',
  goalButton: '#42553a',
  goalText: '#c4d4b4',
  summary: '#29372a',
  metrics: '#29372a',
  addExercise: '#29372a',
  navBackground: '#202c22ed',
  navBorder: '#394835',
  navSelected: '#3b4e32',
  navText: '#a4b39c',
  primaryButton: '#98bb77',
  primaryText: '#172510',
  orb: '#17251015',
  secondaryButton: '#29372a',
  secondaryText: '#c0d3ac',
  chip: '#29372a',
  chipText: '#c0d3ac',
  trained: '#98bb77',
  routineMark: '#29372a',
  routineMarkText: '#c0d3ac',
  dateTile: '#29372a',
  dateTileText: '#c0d3ac',
  setInput: '#29372a',
  setInputText: '#e4ecdf',
  setDone: '#324b2c',
  setDoneText: '#dceacc',
  checkIdle: '#34432e',
  checkIdleText: '#9daf90',
  checkDone: '#98bb77',
  stepperBar: '#354530',
  warmup: '#4a4028',
  warmupText: '#e0c592',
  rest: '#344f30',
  restDone: '#3f6138',
  restLabel: '#b2c8a4',
  danger: '#b8604f',
  dangerText: '#d3a08f',
  errorBackground: '#422c26',
  errorText: '#f2b49e',
  prBadge: '#4a4028',
  prBadgeText: '#e0c592',
  amber: '#c9831122',
  amberText: '#edc56d',
  sparkline: '#98bb77',
  trendLine: '#98bb77',
  dailyLine: '#4a5a45',
  dot: '#7c8f6f',
  grid: '#364331',
  axis: '#a4b39c',
  dialog: '#1d271f',
  dialogBorder: '#33422d',
  input: '#29372a',
  inputBorder: '#425039',
  inputText: '#e4ecdf',
  placeholder: '#7f8d78',
  scrim: '#00000099',
  message: '#29372a',
  mine: '#91b373',
  mineText: '#13251c',
};

export const radius = { card: 24, bezel: 29, pill: 100, sheet: 28, field: 12 };
export const ease = { out: [0.23, 1, 0.32, 1] as const };

export type Weight = 400 | 500 | 600 | 700;
const families: Record<Weight, string> = {
  400: 'Outfit_400Regular',
  500: 'Outfit_500Medium',
  600: 'Outfit_600SemiBold',
  700: 'Outfit_700Bold',
};
let fontsReady = false;
export function markFontsReady(ready: boolean) {
  fontsReady = ready;
}
// Custom families carry their own weight; the system fallback needs fontWeight.
export function font(weight: Weight = 400): TextStyle {
  return fontsReady
    ? { fontFamily: families[weight] }
    : { fontWeight: String(weight) as TextStyle['fontWeight'] };
}

export type ThemePreference = 'light' | 'dark' | 'system';
const THEME_KEY = 'form-theme';
const ThemeContext = createContext<{
  theme: Theme;
  preference: ThemePreference;
  setPreference: (value: ThemePreference) => void;
}>({ theme: light, preference: 'system', setPreference: () => {} });

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  useEffect(() => {
    let alive = true;
    void AsyncStorage.getItem(THEME_KEY)
      .then((saved) => {
        if (
          alive &&
          (saved === 'light' || saved === 'dark' || saved === 'system')
        )
          setPreferenceState(saved);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  const value = useMemo(() => {
    const resolved =
      preference === 'system'
        ? system === 'dark'
          ? 'dark'
          : 'light'
        : preference;
    return {
      theme: resolved === 'dark' ? dark : light,
      preference,
      setPreference: (next: ThemePreference) => {
        setPreferenceState(next);
        void AsyncStorage.setItem(THEME_KEY, next).catch(() => {});
      },
    };
  }, [preference, system]);
  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}
export function useTheme() {
  return useContext(ThemeContext);
}
