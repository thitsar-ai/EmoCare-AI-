import React, { useMemo } from 'react';
import { Image, StyleSheet, View, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Circle,
  Fill,
  Group,
  RadialGradient,
  Shader,
  vec,
  useClock,
} from '@shopify/react-native-skia';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { getVoiceSphereShader } from './voiceSphereShader';

const EMO_FACE = require('../../assets/emo-face-transparent.png');

export interface VoiceSanctuarySphereProps {
  isVoiceModeActive: SharedValue<number>;
  audioVolume: SharedValue<number>;
  ambientProgress: SharedValue<number>;
  /** 0 = Oracle (champagne), 1 = Sanctuary (velvet). */
  voiceIntent: SharedValue<number>;
}

export function VoiceSanctuarySphere({
  isVoiceModeActive,
  audioVolume,
  ambientProgress,
  voiceIntent,
}: VoiceSanctuarySphereProps) {
  const { width, height } = useWindowDimensions();
  const clock = useClock();
  const shader = useMemo(() => getVoiceSphereShader(), []);
  const canvasSize = Math.min(width, height) * 0.76;

  const sphereStyle = useAnimatedStyle(() => {
    const compact = 112;
    const expanded = Math.min(width, height) * 0.58;
    const size = compact + (expanded - compact) * isVoiceModeActive.value;
    return {
      width: size + 48,
      height: size + 48,
      opacity: interpolate(isVoiceModeActive.value, [0, 0.04, 1], [0.85, 1, 1], Extrapolation.CLAMP),
      transform: [{ scale: 0.92 + isVoiceModeActive.value * 0.08 }],
    };
  });

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + audioVolume.value * 0.14 + isVoiceModeActive.value * 0.06 }],
  }));

  const uniforms = useDerivedValue(() => {
    const compact = 112;
    const expanded = Math.min(width, height) * 0.7;
    const size = compact + (expanded - compact) * isVoiceModeActive.value;
    return {
      uResolution: vec(size + 48, size + 48),
      uTime: clock.value / 1000,
      uVolume: audioVolume.value,
      uAmbient: ambientProgress.value,
      uIntent: voiceIntent.value,
    };
  });

  return (
    <Animated.View style={[styles.wrap, sphereStyle]} pointerEvents="box-none">
      <Canvas style={[StyleSheet.absoluteFill, { backgroundColor: 'transparent' }]} pointerEvents="none">
        {shader ? (
          <Fill>
            <Shader source={shader} uniforms={uniforms} />
          </Fill>
        ) : (
          <Group>
            <Circle cx={canvasSize * 0.5} cy={canvasSize * 0.5} r={canvasSize * 0.36}>
              <RadialGradient
                c={vec(canvasSize * 0.5, canvasSize * 0.5)}
                r={canvasSize * 0.4}
                colors={['rgba(196,168,248,0.55)', 'rgba(107,79,168,0.22)', 'transparent']}
              />
            </Circle>
          </Group>
        )}
      </Canvas>

      <Animated.View style={[styles.faceWrap, faceStyle]}>
        <Image source={EMO_FACE} style={styles.face} resizeMode="contain" />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  faceWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  face: {
    width: '46%',
    height: '46%',
  },
});
