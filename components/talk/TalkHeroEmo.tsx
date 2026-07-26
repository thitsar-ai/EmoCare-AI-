import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { getSanctuaryEmoTopClipGuard } from '../../theme/sanctuaryEmoFace';
import { SANCTUARY_EMO_SCALES, SanctuaryEmoPresence } from '../shared/SanctuaryEmoPresence';

export type TalkEmoOrbSize = 'hero' | 'header' | 'compact';

/** Glowing lavender Emo orb — Talk, Voice Talk, and Oracle heroes. */
export function TalkHeroEmo({
  theme,
  size = 'hero',
}: {
  theme: CircadianTheme;
  size?: TalkEmoOrbSize;
  /** @deprecated Ignored — use `size="compact"` instead. */
  compact?: boolean;
}) {
  const resolvedSize: TalkEmoOrbSize = size;
  const scale = SANCTUARY_EMO_SCALES[resolvedSize === 'hero' ? 'hero' : resolvedSize];
  const topGuard = resolvedSize === 'header' ? getSanctuaryEmoTopClipGuard(scale) : 0;

  return (
    <View
      style={[
        styles.wrap,
        resolvedSize === 'header' && styles.wrapHeader,
        topGuard > 0 && { paddingTop: topGuard },
      ]}
      pointerEvents="none"
    >
      <SanctuaryEmoPresence theme={theme} scale={scale} />
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
  wrapHeader: {
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 2,
    flexShrink: 0,
    overflow: 'visible',
  },
});
