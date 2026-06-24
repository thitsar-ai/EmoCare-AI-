import React from 'react';
import type { CircadianTheme } from '../../theme/circadianTheme';
import {
  SanctuaryEmoPresence,
  type SanctuaryEmoPresenceSize,
} from './SanctuaryEmoPresence';

export function EmoOrb({
  theme,
  scale = 1,
  pulse: _pulse = true,
  minimal = false,
  faceScale: _faceScale = 1,
}: {
  theme: CircadianTheme;
  scale?: number;
  faceScale?: number;
  pulse?: boolean;
  /** Face + lace only — no glow rings. */
  minimal?: boolean;
}) {
  return (
    <SanctuaryEmoPresence
      theme={theme}
      scale={scale}
      faceOnly={minimal}
    />
  );
}

export type { SanctuaryEmoPresenceSize };
