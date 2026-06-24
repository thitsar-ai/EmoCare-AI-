import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { SANCTUARY_EMO_STANDARD_SCALE } from '../../theme/sanctuaryEmoFace';
import { SANCTUARY_EMO_SCALES, SanctuaryEmoPresence } from '../shared/SanctuaryEmoPresence';

export type TalkEmoOrbSize = 'hero' | 'header' | 'compact';

/** Glowing lavender Emo orb — Talk, Voice Talk, and Oracle heroes. */
export function TalkHeroEmo({
  theme,
  size: _size = 'hero',
  /** @deprecated Ignored — all talk heroes use SANCTUARY_EMO_STANDARD_SCALE. */
  compact: _compact = false,
}: {
  theme: CircadianTheme;
  size?: TalkEmoOrbSize;
  compact?: boolean;
}) {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <SanctuaryEmoPresence theme={theme} scale={SANCTUARY_EMO_STANDARD_SCALE} />
    </View>
  );
}

export { SANCTUARY_EMO_SCALES };

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    paddingTop: 4,
    paddingBottom: 8,
  },
});
