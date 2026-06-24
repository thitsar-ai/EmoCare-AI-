import React from 'react';
import { Animated, StyleSheet, View, type ImageSourcePropType } from 'react-native';

type Props = {
  source: ImageSourcePropType;
  size: number;
  scale?: Animated.AnimatedInterpolation<number> | number;
  accessibilityLabel?: string;
};

/** Full Emo orb artwork — face, leaves, lace, and glow; no circular crop or ivory ring. */
export function SanctuaryEmoOrbFace({
  source,
  size,
  scale = 1,
  accessibilityLabel = 'Emo',
}: Props) {
  return (
    <View style={[styles.frame, { width: size, height: size }]}>
      <Animated.Image
        source={source}
        resizeMode="contain"
        accessibilityLabel={accessibilityLabel}
        style={{
          width: size,
          height: size,
          transform: [{ scale }],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
});
