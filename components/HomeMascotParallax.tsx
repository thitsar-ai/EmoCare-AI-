import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Reanimated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

/** Dampened parallax — mascot lags behind scroll for glass depth. */
export const MASCOT_PARALLAX_RATIO = 0.3;

/** Scroll distance over which scale fades from 1.0 → 0.9 and opacity 1.0 → 0.4. */
export const MASCOT_DEPTH_SCROLL_RANGE = 320;

export function useHomeMascotParallaxStyle(scrollY: SharedValue<number>) {
  return useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [0, MASCOT_DEPTH_SCROLL_RANGE],
      [1, 0.4],
      Extrapolation.CLAMP,
    ),
    transform: [
      { translateY: scrollY.value * MASCOT_PARALLAX_RATIO },
      {
        scale: interpolate(
          scrollY.value,
          [0, MASCOT_DEPTH_SCROLL_RANGE],
          [1, 0.9],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));
}

export interface HomeMascotParallaxZoneProps {
  scrollY: SharedValue<number>;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Central mascot zone — parallax, scale, and fade driven entirely on the UI thread.
 */
export function HomeMascotParallaxZone({ scrollY, children, style }: HomeMascotParallaxZoneProps) {
  const parallaxStyle = useHomeMascotParallaxStyle(scrollY);

  return (
    <Reanimated.View style={[style, parallaxStyle]}>
      {children}
    </Reanimated.View>
  );
}
