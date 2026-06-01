import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
import Svg, { Circle as SvgCircle } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useDerivedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { getBreathOrbShader } from './breathOrbShader';

const AnimatedCircle = Animated.createAnimatedComponent(SvgCircle);

const ORB_SIZE = 248;
const RING_SIZE = ORB_SIZE + 56;
const RING_RADIUS = RING_SIZE / 2 - 6;
const RING_CIRC = 2 * Math.PI * RING_RADIUS;

export const BREATH_ORB_RING_SIZE = ORB_SIZE + 56;

export function BreathMorphOrb({
  scale,
  progress,
  phaseUniform,
  onPress,
  disabled,
  instruction,
}: {
  scale: SharedValue<number>;
  progress: SharedValue<number>;
  phaseUniform: SharedValue<number>;
  onPress?: () => void;
  disabled?: boolean;
  instruction?: React.ReactNode;
}) {
  const clock = useClock();
  const shader = useMemo(() => getBreathOrbShader(), []);

  const uniforms = useDerivedValue(() => ({
    uResolution: vec(ORB_SIZE, ORB_SIZE),
    uTime: clock.value / 1000,
    uScale: scale.value,
    uPhase: phaseUniform.value,
    uProgress: progress.value,
  }));

  const ringProps = useAnimatedProps(() => ({
    strokeDashoffset: RING_CIRC * (1 - progress.value),
  }));

  return (
    <Pressable onPress={onPress} disabled={disabled} style={styles.hitArea}>
      <View style={styles.stack}>
        <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
          <SvgCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1.5}
            fill="none"
          />
          <AnimatedCircle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_RADIUS}
            stroke="rgba(196,168,248,0.55)"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${RING_CIRC} ${RING_CIRC}`}
            animatedProps={ringProps}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </Svg>

        <View style={styles.orbWrap}>
          <Canvas style={{ width: ORB_SIZE, height: ORB_SIZE }}>
            {shader ? (
              <Fill>
                <Shader source={shader} uniforms={uniforms} />
              </Fill>
            ) : (
              <Group>
                <Circle cx={ORB_SIZE / 2} cy={ORB_SIZE / 2} r={ORB_SIZE * 0.36}>
                  <RadialGradient
                    c={vec(ORB_SIZE / 2, ORB_SIZE * 0.42)}
                    r={ORB_SIZE * 0.42}
                    colors={['rgba(124,92,255,0.75)', 'rgba(32,24,68,0.35)', 'transparent']}
                  />
                </Circle>
              </Group>
            )}
          </Canvas>
          {instruction ? (
            <View style={styles.instructionOverlay} pointerEvents="none">
              {instruction}
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hitArea: { alignItems: 'center', justifyContent: 'center' },
  stack: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSvg: { position: 'absolute' },
  orbWrap: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instructionOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
});
