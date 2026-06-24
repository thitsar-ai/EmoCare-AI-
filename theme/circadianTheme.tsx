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
import { tokens, menuSurface, SANCTUARY_SPLASH as TOKEN_SPLASH } from './tokens';

export type CircadianPhase = 'morning' | 'afternoon' | 'evening' | 'night';

export type CircadianTheme = {
  gradient: readonly [string, string];
  phase: CircadianPhase;
  isDark: boolean;
  text: string;
  secondaryText: string;
  mutedText: string;
  card: string;
  cardLavender: string;
  cardElevated: string;
  cardBorder: string;
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

/** Icon stroke on circadian surfaces. */
export function getCircadianIconColor(
  theme: CircadianTheme,
  role: 'accent' | 'secondary' | 'muted' = 'accent',
): string {
  if (role === 'accent') return theme.accent;
  if (role === 'secondary') return theme.secondaryText;
  return theme.mutedText;
}

/** Menu / modal sheet tokens — light sanctuary in all phases. */
export const DARK_MENU_SURFACE = menuSurface;

const EMO_FACE_LAVENDER_TRANSPARENT: ImageSourcePropType = require('../assets/emo-face-lavender-transparent.png');

export const SANCTUARY_SPLASH = TOKEN_SPLASH;

const SANCTUARY_LINGUISTIC = {
  isDark: false as const,
  text: tokens.text.primary,
  secondaryText: tokens.text.body,
  mutedText: tokens.text.secondary,
  card: tokens.bg.card,
  cardLavender: tokens.bg.card,
  cardElevated: tokens.bg.elevated,
  cardBorder: tokens.glass.cardBorder,
  border: tokens.border.standard,
  navBar: tokens.bg.elevated,
  navBarBorder: tokens.border.standard,
  heroWash: [`${tokens.brand.gradMid2}33`, 'rgba(244, 236, 251, 0)'] as const,
  barTrack: tokens.border.standard,
  barFill: tokens.brand.gradEnd,
};

/** Unified canvas — Sanctuary web gradient (#F4ECFB → #E8DBF4). */
const PHASE_GRADIENT: Record<CircadianPhase, readonly [string, string]> = {
  morning: [tokens.bg.canvasTop, tokens.bg.canvasBottom],
  afternoon: [tokens.bg.canvasTop, tokens.bg.canvasBottom],
  evening: [tokens.bg.canvasTop, tokens.bg.canvasBottom],
  night: [tokens.bg.canvasTop, tokens.bg.canvasBottom],
};

function getEmoFaceForPhase(_phase: CircadianPhase): ImageSourcePropType {
  return EMO_FACE_LAVENDER_TRANSPARENT;
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

  const phaseAccent: Record<
    CircadianPhase,
    Pick<CircadianTheme, 'accent' | 'glow' | 'presenceLine' | 'ringGradient'>
  > = {
    morning: {
      accent: tokens.text.primary,
      glow: `${tokens.brand.gradEnd}47`,
      presenceLine: 'Lavender horizon · morning light',
      ringGradient: [tokens.brand.gradStart, tokens.brand.gradEnd],
    },
    afternoon: {
      accent: tokens.text.primary,
      glow: `${tokens.brand.gradMid2}3D`,
      presenceLine: 'Cognitive bandwidth · steady focus',
      ringGradient: [tokens.brand.gradStart, tokens.brand.gradEnd],
    },
    evening: {
      accent: tokens.text.primary,
      glow: `${tokens.brand.gradMid}59`,
      presenceLine: 'Sunset decompression · winding down',
      ringGradient: [tokens.brand.gradStart, tokens.brand.gradEnd],
    },
    night: {
      accent: tokens.text.primary,
      glow: `${tokens.brand.gradEnd}59`,
      presenceLine: 'Quiet sanctuary · gentle night',
      ringGradient: [tokens.brand.gradStart, tokens.brand.gradEnd],
    },
  };

  return {
    ...SANCTUARY_LINGUISTIC,
    ...phaseAccent[phase],
    phase,
    gradient,
    emoFace: getEmoFaceForPhase(phase),
  };
}

/** Onboarding uses the same light sanctuary canvas. */
export function getOnboardingTheme(): CircadianTheme {
  return getCircadianTheme();
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
