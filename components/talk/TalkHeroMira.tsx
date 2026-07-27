import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';

const MIRA_FACE = require('../../assets/mira-face.png');

type Props = {
  theme: CircadianTheme;
  size?: 'compact' | 'header' | 'hero';
};

const SIZES = {
  compact: 72,
  header: 56,
  hero: 112,
};

/** Mira companion face — distinct from Emo / အီမို. */
export function TalkHeroMira({ theme, size = 'compact' }: Props) {
  const dim = SIZES[size] ?? SIZES.compact;
  return (
    <View
      style={[
        styles.wrap,
        {
          width: dim + 8,
          height: dim + 8,
          shadowColor: theme.accent,
        },
      ]}
      accessibilityLabel="Mira guidance companion"
    >
      <Image source={MIRA_FACE} style={{ width: dim, height: dim }} resizeMode="contain" />
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
