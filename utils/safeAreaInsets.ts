import { Platform } from 'react-native';
import { initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Fallback when hooks report 0 on notched / Dynamic Island devices (common in Expo Go).
 * Do not apply when the OS already returns a positive inset (e.g. iPhone SE ~20pt).
 */
const IOS_TOP_FALLBACK = 59;
const ANDROID_TOP_FALLBACK = 28;

function resolveTop(rawTop: number, metricsTop: number): number {
  if (rawTop > 0) return rawTop;
  if (metricsTop > 0) return metricsTop;
  return Platform.OS === 'ios' ? IOS_TOP_FALLBACK : ANDROID_TOP_FALLBACK;
}

/**
 * Safe-area insets with a reliable minimum top value when the OS reports 0.
 * Prefer ScreenSafeArea / explicit paddingTop over SafeAreaView alone.
 */
export function useLayoutInsets() {
  const insets = useSafeAreaInsets();
  const metricsTop = initialWindowMetrics?.insets.top ?? 0;
  const metricsBottom = initialWindowMetrics?.insets.bottom ?? 0;
  const rawTop = insets.top ?? 0;
  const rawBottom = insets.bottom ?? 0;
  const top = resolveTop(rawTop, metricsTop);
  const bottom = Math.max(rawBottom, metricsBottom);

  return { top, bottom, left: insets.left ?? 0, right: insets.right ?? 0 };
}

export function topInsetWithExtra(extra = 0): number {
  const metricsTop = initialWindowMetrics?.insets.top ?? 0;
  const top = resolveTop(0, metricsTop);
  return top + extra;
}
