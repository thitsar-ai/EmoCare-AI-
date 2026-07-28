import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { getSanctuaryEmoFace, getSanctuaryEmoTopClipGuard } from '../../theme/sanctuaryEmoFace';
import { SANCTUARY_EMO_SCALES, SanctuaryEmoPresence } from '../shared/SanctuaryEmoPresence';

export type TalkEmoOrbSize = 'hero' | 'header' | 'compact';

const HEADER_DIM = 104;
const COMPACT_DIM = 96;

/**
 * Floating translucent Emo face (not a face trapped in a hard globe).
 * Header/compact match Mira’s simple Image presentation; hero keeps soft breathe motion.
 */
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

  if (resolvedSize === 'header' || resolvedSize === 'compact') {
    const dim = resolvedSize === 'header' ? HEADER_DIM : COMPACT_DIM;
    return (
      <View
        style={[
          styles.flatWrap,
          resolvedSize === 'header' && styles.wrapHeader,
          { width: dim + 8, height: dim + 8 },
        ]}
        pointerEvents="none"
        accessibilityLabel="Emo, your companion"
      >
        <Image
          source={getSanctuaryEmoFace(theme.phase)}
          style={{ width: dim, height: dim }}
          resizeMode="contain"
        />
      </View>
    );
  }

  const scale = SANCTUARY_EMO_SCALES.hero;
  const topGuard = getSanctuaryEmoTopClipGuard(scale);

  return (
    <View style={[styles.wrap, topGuard > 0 && { paddingTop: topGuard }]} pointerEvents="none">
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
  flatWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  wrapHeader: {
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 2,
    flexShrink: 0,
  },
});
