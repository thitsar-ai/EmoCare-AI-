import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { getSanctuaryEmoFace, getSanctuaryEmoOrbSize } from '../../theme/sanctuaryEmoFace';

export function EmoOrb({
  theme,
  scale = 1,
  faceScale = 1,
  pulse = true,
  minimal = false,
}: {
  theme: CircadianTheme;
  scale?: number;
  /** Scales face art only — breathing rings stay tied to `scale`. */
  faceScale?: number;
  pulse?: boolean;
  /** Face only — no breathing rings (splash, compact layouts). */
  minimal?: boolean;
}) {
  const faceSource = getSanctuaryEmoFace(theme.phase);
  const faceSize = getSanctuaryEmoOrbSize(scale);
  const ringOuter = faceSize * 1.85;
  const ringMid = faceSize * 1.53;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 2600,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim, pulse]);

  const ringScale = pulse ? anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) : 1;
  const ringOpacity = pulse ? anim.interpolate({ inputRange: [0, 1], outputRange: [0.28, 0.52] }) : 0.38;
  const faceVisualScale = pulse
    ? anim.interpolate({ inputRange: [0, 1], outputRange: [faceScale, faceScale * 1.04] })
    : faceScale;

  if (minimal) {
    return (
      <View style={[styles.stage, { width: faceSize, height: faceSize }]}>
        <Animated.Image
          source={faceSource}
          resizeMode="contain"
          style={{
            width: faceSize,
            height: faceSize,
            transform: [{ scale: faceVisualScale }],
          }}
        />
      </View>
    );
  }

  return (
    <View style={[styles.stage, { width: ringOuter, height: ringOuter }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            width: ringOuter,
            height: ringOuter,
            borderColor: `${theme.accent}28`,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.ring,
          {
            width: ringMid,
            height: ringMid,
            borderColor: `${theme.accent}44`,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      <Animated.Image
        source={faceSource}
        resizeMode="contain"
        style={{
          width: faceSize,
          height: faceSize,
          transform: [{ scale: faceVisualScale }],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1.5,
    borderRadius: 999,
  },
});
