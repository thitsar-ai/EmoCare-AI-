import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';

const MIRA_FACE = require('../../assets/mira-face.png');

type Props = {
  theme: CircadianTheme;
  size?: 'compact' | 'header' | 'hero';
};

const SIZES = {
  compact: 96,
  header: 104,
  hero: 200,
};

/** Mira companion face — distinct from Emo / အီမို. */
export function TalkHeroMira({ theme, size = 'compact' }: Props) {
  const dim = SIZES[size] ?? SIZES.compact;
  const height = Math.round(dim * (1024 / 682));
  return (
    <View
      style={[
        styles.wrap,
        {
          width: dim + 8,
          height: height + 8,
          shadowColor: theme.accent,
        },
      ]}
      accessibilityLabel="Mira guidance companion"
    >
      <Image source={MIRA_FACE} style={{ width: dim, height }} resizeMode="contain" />
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
