import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Animated, AppState, Easing, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export type CircadianPhase = 'morning' | 'afternoon' | 'evening' | 'night';

export type CircadianTheme = {
  gradient: readonly [string, string];
  phase: CircadianPhase;
  isDark: boolean;
  text: string;
  secondaryText: string;
  mutedText: string;
  card: string;
  border: string;
  navBar: string;
  navBarBorder: string;
  accent: string;
  glow: string;
  heroWash: readonly [string, string];
  emoFace: ImageSourcePropType;
  presenceLine: string;
  ringGradient: readonly [string, string];
  barTrack: string;
  barFill: string;
};

/** Text tokens for fixed dark overlay sheets (menu, profile) — readable in all circadian phases. */
export const DARK_MENU_SURFACE = {
  text: '#FFFFFF',
  secondaryText: '#C4B7FF',
  mutedText: '#A99CCF',
  card: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.12)',
} as const;

const EMO_FACE_DAY: ImageSourcePropType = require('../assets/emo-face-day.png');
const EMO_FACE_LAVENDER: ImageSourcePropType = require('../assets/emo-face-lavender.png');
const EMO_FACE_LAVENDER_TRANSPARENT: ImageSourcePropType = require('../assets/emo-face-lavender-transparent.png');
const EMO_FACE_NIGHT_KEYED: ImageSourcePropType = require('../assets/emo-face-night-keyed.png');

/** @deprecated Use live chrono theme — night phase matches onboarding canvas. */
export const SANCTUARY_SPLASH = ['#0D0720', '#1A0F2E'] as const;

const LIGHT_LINGUISTIC = {
  isDark: false as const,
  text: '#2D1B4A',
  secondaryText: '#5C4A7A',
  mutedText: '#7A6B96',
  card: 'rgba(255,255,255,0.75)',
  border: 'rgba(45,27,74,0.12)',
  navBar: 'rgba(255,255,255,0.75)',
  navBarBorder: 'rgba(45,27,74,0.10)',
  heroWash: ['rgba(232,228,245,0.55)', 'rgba(240,236,248,0)'] as const,
  barTrack: 'rgba(45,27,74,0.12)',
  barFill: '#7B5CFF',
};

const DARK_LINGUISTIC = {
  isDark: true as const,
  text: '#FFFFFF',
  secondaryText: '#C4B7FF',
  mutedText: '#A99CCF',
  card: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.10)',
  navBar: 'rgba(26,15,46,0.88)',
  navBarBorder: 'rgba(255,255,255,0.10)',
  heroWash: ['rgba(45,27,74,0.55)', 'rgba(13,7,32,0)'] as const,
  barTrack: 'rgba(255,255,255,0.15)',
  barFill: '#B79DFF',
};

const PHASE_GRADIENT: Record<CircadianPhase, readonly [string, string]> = {
  morning: ['#E8E4F5', '#F0ECF8'],
  afternoon: ['#DDD6F3', '#EDE8F5'],
  evening: ['#2D1B4A', '#1A0F2E'],
  night: ['#0D0720', '#1A0F2E'],
};

function getEmoFaceForPhase(phase: CircadianPhase): ImageSourcePropType {
  switch (phase) {
    case 'morning':
      return EMO_FACE_LAVENDER;
    case 'afternoon':
      return EMO_FACE_DAY;
    case 'evening':
      return EMO_FACE_LAVENDER_TRANSPARENT;
    default:
      return EMO_FACE_NIGHT_KEYED;
  }
}

/** Local device hour — never UTC. */
export function getCircadianPhase(date: Date = new Date()): CircadianPhase {
  const hour = date.getHours();
  if (hour >= 6 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 17) return 'afternoon';
  if (hour >= 18 && hour <= 21) return 'evening';
  return 'night';
}

export function getCircadianTheme(date: Date = new Date()): CircadianTheme {
  const phase = getCircadianPhase(date);
  const gradient = PHASE_GRADIENT[phase];
  const linguistic = phase === 'morning' || phase === 'afternoon' ? LIGHT_LINGUISTIC : DARK_LINGUISTIC;

  const phaseAccent: Record<
    CircadianPhase,
    Pick<CircadianTheme, 'accent' | 'glow' | 'presenceLine' | 'ringGradient'>
  > = {
    morning: {
      accent: '#7B5CFF',
      glow: 'rgba(123,92,255,0.28)',
      presenceLine: 'Lavender horizon · morning light',
      ringGradient: ['#9B7BFF', '#C4A8FF'],
    },
    afternoon: {
      accent: '#6B52C9',
      glow: 'rgba(107,82,201,0.24)',
      presenceLine: 'Cognitive bandwidth · steady focus',
      ringGradient: ['#8B6FD4', '#B89AFF'],
    },
    evening: {
      accent: '#B79DFF',
      glow: 'rgba(183,157,255,0.35)',
      presenceLine: 'Sunset decompression · winding down',
      ringGradient: ['#6E52B8', '#A88FFF'],
    },
    night: {
      accent: '#C6B0FF',
      glow: 'rgba(198,176,255,0.35)',
      presenceLine: 'Velvet obsidian · night sanctuary',
      ringGradient: ['#5E48A8', '#9B7BFF'],
    },
  };

  return {
    ...linguistic,
    ...phaseAccent[phase],
    phase,
    gradient,
    emoFace: getEmoFaceForPhase(phase),
  };
}

/** @deprecated Onboarding uses live chrono theme (night = velvet obsidian). */
export function getOnboardingTheme(): CircadianTheme {
  return getCircadianTheme(new Date(new Date().setHours(23, 0, 0, 0)));
}

const CircadianThemeContext = createContext<CircadianTheme | null>(null);

function ChronoGradientLayer({ colors }: { colors: readonly [string, string] }) {
  return (
    <LinearGradient
      colors={[colors[0], colors[1]]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={StyleSheet.absoluteFillObject}
    />
  );
}

function useCircadianThemeClock(): CircadianTheme {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setTick((t) => t + 1);
    });
    return () => {
      clearInterval(interval);
      sub.remove();
    };
  }, []);

  return useMemo(() => getCircadianTheme(), [tick]);
}

/**
 * Global chrono-interface provider — single background canvas for the entire app.
 * Phase transitions cross-dissolve over ~450ms.
 */
export function CircadianThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useCircadianThemeClock();
  const phaseRef = useRef(theme.phase);
  const [layers, setLayers] = useState({
    base: theme.gradient,
    overlay: theme.gradient,
  });
  const dissolve = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (theme.phase === phaseRef.current) return;

    setLayers((prev) => ({ base: prev.overlay, overlay: theme.gradient }));
    phaseRef.current = theme.phase;
    dissolve.setValue(0);
    Animated.timing(dissolve, {
      toValue: 1,
      duration: 450,
      easing: Easing.inOut(Easing.ease),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        setLayers({ base: theme.gradient, overlay: theme.gradient });
        dissolve.setValue(0);
      }
    });
  }, [theme.phase, theme.gradient, dissolve]);

  return (
    <CircadianThemeContext.Provider value={theme}>
      <View style={styles.root}>
        <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
          <ChronoGradientLayer colors={layers.base} />
          <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: dissolve }]}>
            <ChronoGradientLayer colors={layers.overlay} />
          </Animated.View>
        </View>
        <View style={styles.foreground}>{children}</View>
      </View>
    </CircadianThemeContext.Provider>
  );
}

/** Consume the active chrono theme — must be inside CircadianThemeProvider. */
export function useCircadianTheme(): CircadianTheme {
  const ctx = useContext(CircadianThemeContext);
  if (!ctx) {
    return getCircadianTheme();
  }
  return ctx;
}

/** @deprecated Background is rendered once at provider root. Kept as no-op for gradual migration. */
export function CircadianBackground(_props: { theme?: CircadianTheme }) {
  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  foreground: { flex: 1, zIndex: 1 },
});
