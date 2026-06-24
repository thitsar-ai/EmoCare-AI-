import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
} from 'react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { getSanctuaryEmoFace, getSanctuaryEmoOrbSize } from '../../theme/sanctuaryEmoFace';
import { SanctuaryEmoOrbFace } from '../shared/SanctuaryEmoOrbFace';

const BREATHE_MS = 2000;
const FLOAT_MS = 3400;

function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduceMotion)
      .catch(() => setReduceMotion(false));
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  return reduceMotion;
}

/** Floating sanctuary companion — gentle breathe + hover; transparent orb art only. */
export function SanctuaryHeroEmo({
  theme,
  scale = 0.91,
}: {
  theme: CircadianTheme;
  scale?: number;
}) {
  const breathe = useRef(new Animated.Value(0)).current;
  const float = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();
  const faceSource = getSanctuaryEmoFace(theme.phase);
  const faceSize = getSanctuaryEmoOrbSize(scale);
  /** Extra canvas so leaf tips aren't clipped by tight square bounds. */
  const leafPad = Math.round(faceSize * 0.16);
  const stageSize = faceSize + leafPad * 2;

  useEffect(() => {
    if (reduceMotion) return;

    const breatheLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, {
          toValue: 1,
          duration: BREATHE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathe, {
          toValue: 0,
          duration: BREATHE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );

    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: FLOAT_MS,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: FLOAT_MS,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    breatheLoop.start();
    floatLoop.start();
    return () => {
      breatheLoop.stop();
      floatLoop.stop();
    };
  }, [breathe, float, reduceMotion]);

  const faceScaleAnim = reduceMotion
    ? 1
    : breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.045] });
  const translateY = reduceMotion
    ? 0
    : float.interpolate({ inputRange: [0, 1], outputRange: [2, -7] });

  return (
    <View style={[styles.stage, { width: stageSize, height: stageSize }]}>
      <Animated.View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateY }],
        }}
      >
        <View
          style={[
            styles.orbFrame,
            {
              width: stageSize,
              height: stageSize,
            },
          ]}
        >
          <SanctuaryEmoOrbFace
            source={faceSource}
            size={faceSize}
            scale={faceScaleAnim}
            accessibilityLabel="Emo, your companion"
          />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbFrame: {
    overflow: 'visible',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
