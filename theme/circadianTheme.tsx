import React, { useEffect, useMemo, useState } from 'react';
import { AppState, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export type CircadianPhase = 'morning' | 'afternoon' | 'evening' | 'night';

export type CircadianTheme = {
  gradient: readonly [string, string];
  splashGradient: readonly string[];
  phase: CircadianPhase;
  isDark: boolean;
  text: string;
  secondaryText: string;
  mutedText: string;
  card: string;
  border: string;
  accent: string;
  glow: string;
  heroWash: readonly [string, string];
  emoFace: ImageSourcePropType;
  presenceLine: string;
  ringGradient: readonly [string, string];
  barTrack: string;
  barFill: string;
};

const EMO_FACE_DAY: ImageSourcePropType = require('../assets/emo-face-day.png');
const EMO_FACE_LAVENDER: ImageSourcePropType = require('../assets/emo-face-lavender.png');
const EMO_FACE_LAVENDER_TRANSPARENT: ImageSourcePropType = require('../assets/emo-face-lavender-transparent.png');
const EMO_FACE_NIGHT_KEYED: ImageSourcePropType = require('../assets/emo-face-night-keyed.png');

export const SANCTUARY_SPLASH = ['#2A1350', '#1C0F38', '#130429'] as const;

const PHASE_SPLASH: Record<CircadianPhase, readonly [string, string, string]> = {
  morning: ['#351A5E', '#211240', '#150A2C'],
  afternoon: ['#2A1350', '#1C0F38', '#130429'],
  evening: ['#301248', '#1E0A36', '#110524'],
  night: ['#1E0B38', '#14082A', '#0A0318'],
};

const PHASE_GRADIENT: Record<CircadianPhase, readonly [string, string]> = {
  morning: ['#321858', '#1A0F32'],
  afternoon: ['#2D1B4A', '#1A0F2E'],
  evening: ['#281040', '#160828'],
  night: ['#1A0A30', '#0D0518'],
};

const SHARED_SURFACE = {
  isDark: true as const,
  text: '#FFFFFF',
  secondaryText: '#C4B7FF',
  mutedText: '#A99CCF',
  card: 'rgba(255,255,255,0.08)',
  border: 'rgba(255,255,255,0.10)',
  heroWash: ['rgba(42,19,80,0.55)', 'rgba(19,4,41,0)'] as const,
  barTrack: 'rgba(255,255,255,0.15)',
  barFill: '#B79DFF',
};

export function getCircadianPhase(date: Date = new Date()): CircadianPhase {
  const hour = date.getHours();
  if (hour >= 6 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 17) return 'afternoon';
  if (hour >= 18 && hour <= 21) return 'evening';
  return 'night';
}

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

export function getCircadianTheme(date: Date = new Date()): CircadianTheme {
  const phase = getCircadianPhase(date);
  const splashGradient = PHASE_SPLASH[phase];
  const gradient = PHASE_GRADIENT[phase];

  const phaseAccent: Record<
    CircadianPhase,
    Pick<CircadianTheme, 'accent' | 'glow' | 'presenceLine' | 'ringGradient'>
  > = {
    morning: {
      accent: '#B79DFF',
      glow: 'rgba(183,157,255,0.30)',
      presenceLine: 'Morning light · fresh start',
      ringGradient: ['#8B6FD4', '#C4A8FF'],
    },
    afternoon: {
      accent: '#A88FFF',
      glow: 'rgba(168,143,255,0.28)',
      presenceLine: 'Afternoon calm · steady presence',
      ringGradient: ['#7E62CC', '#B89AFF'],
    },
    evening: {
      accent: '#B79DFF',
      glow: 'rgba(183,157,255,0.35)',
      presenceLine: 'Evening glow · winding down',
      ringGradient: ['#6E52B8', '#A88FFF'],
    },
    night: {
      accent: '#C6B0FF',
      glow: 'rgba(198,176,255,0.35)',
      presenceLine: "Night stillness · I'm here",
      ringGradient: ['#5E48A8', '#9B7BFF'],
    },
  };

  return {
    ...SHARED_SURFACE,
    ...phaseAccent[phase],
    phase,
    gradient,
    splashGradient,
    emoFace: getEmoFaceForPhase(phase),
  };
}

/** Live circadian theme — refreshes every minute and when the app returns to foreground. */
export function useCircadianTheme(): CircadianTheme {
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

/** Single source of truth for sanctuary screen backgrounds (all pages). */
export function CircadianBackground({ theme }: { theme: CircadianTheme }) {
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      <LinearGradient
        colors={theme.splashGradient as string[]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
}
