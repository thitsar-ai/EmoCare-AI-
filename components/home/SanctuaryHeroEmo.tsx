import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
} from 'react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import {
  getSanctuaryEmoFace,
  getSanctuaryEmoStageDimensions,
  SANCTUARY_EMO_OPTICAL_SHIFT_Y,
} from '../../theme/sanctuaryEmoFace';
import { SanctuaryEmoOrbFace } from '../shared/SanctuaryEmoOrbFace';

const BREATHE_MS = 2000;
const FLOAT_MS = 3400;
const BREATHE_SCALE_MAX = 1.02;
const FLOAT_Y_RANGE: [number, number] = [1, -4];

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
  const { width: stageW, height: stageH, imageSize } = getSanctuaryEmoStageDimensions(scale);

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
    : breathe.interpolate({ inputRange: [0, 1], outputRange: [1, BREATHE_SCALE_MAX] });
  const translateY = reduceMotion
    ? 0
    : float.interpolate({ inputRange: [0, 1], outputRange: FLOAT_Y_RANGE });

  return (
    <View style={[styles.stage, { width: stageW, height: stageH }]}>
      <Animated.View
        style={{
          width: stageW,
          height: stageH,
          alignItems: 'center',
          justifyContent: 'center',
          transform: [{ translateY }],
        }}
      >
        <Animated.View
          style={{
            transform: [
              { translateY: SANCTUARY_EMO_OPTICAL_SHIFT_Y },
              { scale: faceScaleAnim },
            ],
          }}
        >
          <SanctuaryEmoOrbFace
            source={faceSource}
            size={imageSize}
            accessibilityLabel="Emo, your companion"
          />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
});
