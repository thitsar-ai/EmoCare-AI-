import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';

const MIRA_FACE = require('../../assets/mira-face.png');

type Props = {
  theme: CircadianTheme;
  /** Visual diameter of the Mira orb art. */
  size?: number;
};

/** Mira companion art — square stage with contain, matching Emo card footprint. */
export function SanctuaryMiraPresence({ theme, size = 118 }: Props) {
  return (
    <View
      style={[styles.wrap, { width: size + 8, height: size + 8, shadowColor: theme.accent }]}
      accessibilityLabel="Mira, guidance companion"
      pointerEvents="none"
    >
      <Image source={MIRA_FACE} style={{ width: size, height: size }} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
});
