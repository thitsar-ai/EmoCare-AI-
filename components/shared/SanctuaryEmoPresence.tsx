import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { getSanctuaryEmoFace, getSanctuaryEmoOrbSize, SANCTUARY_EMO_STANDARD_SCALE } from '../../theme/sanctuaryEmoFace';
import { SanctuaryHeroEmo } from '../home/SanctuaryHeroEmo';
import { SanctuaryEmoOrbFace } from './SanctuaryEmoOrbFace';

/** Shared scale presets — one source of truth for Emo orb sizing app-wide. */
export const SANCTUARY_EMO_SCALES = {
  splash: 2.05,
  sanctuary: SANCTUARY_EMO_STANDARD_SCALE,
  hero: SANCTUARY_EMO_STANDARD_SCALE,
  header: 0.48,
  compact: 0.72,
  inline: 0.56,
} as const;

export type SanctuaryEmoPresenceSize = keyof typeof SANCTUARY_EMO_SCALES;

type Props = {
  theme: CircadianTheme;
  /** Preset size — splash, sanctuary home, talk hero, nav header, etc. */
  size?: SanctuaryEmoPresenceSize;
  /** Override preset scale when a screen needs a custom diameter. */
  scale?: number;
  /** Face + lace only — no plate or rings (very tight chips). */
  faceOnly?: boolean;
};

/**
 * Unified Emo orb — transparent artwork (face, leaves, lace) on every screen.
 * No decorative rings or lavender plate behind the art.
 */
export function SanctuaryEmoPresence({
  theme,
  size = 'hero',
  scale,
  faceOnly = false,
}: Props) {
  const resolvedScale = scale ?? SANCTUARY_EMO_SCALES[size];

  if (faceOnly) {
    const faceSize = getSanctuaryEmoOrbSize(resolvedScale);
    return (
      <View style={[styles.faceOnly, { width: faceSize, height: faceSize }]}>
        <SanctuaryEmoOrbFace
          source={getSanctuaryEmoFace(theme.phase)}
          size={faceSize}
          accessibilityLabel="Emo"
        />
      </View>
    );
  }

  return (
    <View style={styles.heroWrap}>
      <SanctuaryHeroEmo theme={theme} scale={resolvedScale} />
    </View>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  faceOnly: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
});
