import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Easing,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { getTimeOfDayFromHour, resolveAmbientProgress } from './livingCanvasAmbient';

/** Organic mood-to-aura blend duration (UI thread, non-blocking). */
export const AMBIENT_BLEND_MS = 1200;

/**
 * Mood → Skia uAmbient target (0 = champagne morning, 1 = velvet obsidian).
 * Radiant band: 0.0–0.3 · Deep consoling band: 0.7–1.0
 */
export const MOOD_AMBIENT_PROGRESS: Record<string, number> = {
  Peaceful: 0.06,
  Light: 0.18,
  Grateful: 0.10,
  Hopeful: 0.26,
  Neutral: 0.42,
  Tired: 0.52,
  Heavy: 0.88,
  Anxious: 0.80,
  Overwhelmed: 0.94,
};

const RADIANT_MOODS = new Set(['Peaceful', 'Light', 'Grateful', 'Hopeful']);
const DEEP_MOODS = new Set(['Heavy', 'Anxious', 'Overwhelmed']);

export function getMoodAmbientProgress(moodLabel: string | null | undefined): number | null {
  if (!moodLabel) return null;
  if (moodLabel in MOOD_AMBIENT_PROGRESS) {
    return MOOD_AMBIENT_PROGRESS[moodLabel];
  }
  return 0.45;
}

export function getTimeOfDayAmbientProgress(): number {
  return resolveAmbientProgress({
    timeOfDay: getTimeOfDayFromHour(new Date().getHours()),
  });
}

export function resolveSanctuaryAmbientTarget(moodLabel: string | null | undefined): number {
  return getMoodAmbientProgress(moodLabel) ?? getTimeOfDayAmbientProgress();
}

interface SanctuaryAmbientContextValue {
  ambientProgress: SharedValue<number>;
  /** Animate canvas to mood target after Save Check-In (1200ms UI-thread blend). */
  applyMoodAmbient: (moodLabel: string) => void;
  refreshFromCheckIns: () => Promise<void>;
}

const SanctuaryAmbientContext = createContext<SanctuaryAmbientContextValue | null>(null);

async function readTodayMoodLabel(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem('checkIns');
    if (!raw) return null;
    const checkIns = JSON.parse(raw) as Array<{ date: string; mood?: { label?: string } }>;
    const today = new Date().toDateString();
    const todayEntry = checkIns.find(
      (entry) => new Date(entry.date).toDateString() === today,
    );
    return todayEntry?.mood?.label ?? null;
  } catch {
    return null;
  }
}

export function SanctuaryAmbientProvider({
  children,
  checkInVersion = 0,
  /** Lock canvas to radiant champagne/lavender (e.g. onboarding). */
  forceRadiant = false,
}: {
  children: React.ReactNode;
  checkInVersion?: number;
  forceRadiant?: boolean;
}) {
  const initialTarget = forceRadiant ? 0.06 : getTimeOfDayAmbientProgress();
  const ambientProgress = useSharedValue(initialTarget);
  const hasHydrated = useRef(false);
  const lastTarget = useRef(initialTarget);

  const blendTo = useCallback((target: number, animated: boolean) => {
    const clamped = Math.min(1, Math.max(0, target));
    if (animated && Math.abs(clamped - lastTarget.current) < 0.001) {
      return;
    }
    lastTarget.current = clamped;

    if (!animated) {
      ambientProgress.value = clamped;
      return;
    }

    ambientProgress.value = withTiming(clamped, {
      duration: AMBIENT_BLEND_MS,
      easing: Easing.bezier(0.37, 0, 0.2, 1),
    });
  }, [ambientProgress]);

  const applyMoodAmbient = useCallback((moodLabel: string) => {
    blendTo(resolveSanctuaryAmbientTarget(moodLabel), true);
  }, [blendTo]);

  const refreshFromCheckIns = useCallback(async () => {
    const moodLabel = await readTodayMoodLabel();
    const target = resolveSanctuaryAmbientTarget(moodLabel);
    const animated = hasHydrated.current;
    blendTo(target, animated);
    hasHydrated.current = true;
  }, [blendTo]);

  useEffect(() => {
    if (forceRadiant) {
      blendTo(0.06, hasHydrated.current);
      hasHydrated.current = true;
      return;
    }
    refreshFromCheckIns();
  }, [checkInVersion, refreshFromCheckIns, forceRadiant, blendTo]);

  const value = useMemo(
    () => ({ ambientProgress, applyMoodAmbient, refreshFromCheckIns }),
    [ambientProgress, applyMoodAmbient, refreshFromCheckIns],
  );

  return (
    <SanctuaryAmbientContext.Provider value={value}>
      {children}
    </SanctuaryAmbientContext.Provider>
  );
}

export function useSanctuaryAmbient(): SanctuaryAmbientContextValue {
  const ctx = useContext(SanctuaryAmbientContext);
  if (!ctx) {
    throw new Error('useSanctuaryAmbient must be used within SanctuaryAmbientProvider');
  }
  return ctx;
}

export { RADIANT_MOODS, DEEP_MOODS };
