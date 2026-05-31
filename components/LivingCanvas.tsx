import React, { useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, Fill, Shader, vec, useClock } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { getLivingCanvasShader } from './livingCanvasShader';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';

export const SANCTUARY_SPRING = { damping: 22, stiffness: 165, mass: 0.9 };

const TIME_AMBIENT: Record<TimeOfDay, number> = {
  morning: 0.06,
  afternoon: 0.18,
  evening: 0.55,
  night: 0.78,
};

export function getTimeOfDayFromHour(hour: number): TimeOfDay {
  if (hour >= 6 && hour <= 11) return 'morning';
  if (hour >= 12 && hour <= 17) return 'afternoon';
  if (hour >= 18 && hour <= 21) return 'evening';
  return 'night';
}

export function resolveAmbientProgress(opts: {
  timeOfDay: TimeOfDay;
  moodLabel?: string | null;
}): number {
  return TIME_AMBIENT[opts.timeOfDay] ?? 0.2;
}

interface LivingCanvasProps {
  children?: React.ReactNode;
  ambientProgress?: SharedValue<number>;
  timeOfDay?: TimeOfDay;
  style?: ViewStyle;
}

export default function LivingCanvas({
  children,
  ambientProgress,
  timeOfDay,
  style,
}: LivingCanvasProps) {
  const { width, height } = useWindowDimensions();
  const clock = useClock();
  const shader = useMemo(() => getLivingCanvasShader(), []);
  const fallbackAmbient = TIME_AMBIENT[timeOfDay ?? getTimeOfDayFromHour(new Date().getHours())];

  const uniforms = useDerivedValue(() => ({
    uResolution: vec(Math.max(width, 1), Math.max(height, 1)),
    uTime: clock.value / 1000,
    uAmbient: ambientProgress?.value ?? fallbackAmbient,
  }));

  return (
    <View style={[styles.root, style]}>
      {shader ? (
        <Canvas style={StyleSheet.absoluteFill} pointerEvents="none">
          <Fill>
            <Shader source={shader} uniforms={uniforms} />
          </Fill>
        </Canvas>
      ) : (
        <LinearGradient
          colors={['#2A1350', '#1C0F38', '#130429']}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      )}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
});
