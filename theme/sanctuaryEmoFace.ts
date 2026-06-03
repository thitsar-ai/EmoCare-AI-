import { PixelRatio, type ImageSourcePropType } from 'react-native';
import type { CircadianPhase } from './circadianTheme';

const EMO_FACE_LAVENDER_TRANSPARENT: ImageSourcePropType = require('../assets/emo-face-lavender-transparent.png');
const EMO_FACE_NIGHT_KEYED: ImageSourcePropType = require('../assets/emo-face-night-keyed.png');

/** Plate-free Emo orb — same identity day and night; night uses keyed art on dark canvas. */
export function getSanctuaryEmoFace(phase: CircadianPhase): ImageSourcePropType {
  if (phase === 'night' || phase === 'evening') {
    return EMO_FACE_NIGHT_KEYED;
  }
  return EMO_FACE_LAVENDER_TRANSPARENT;
}

/** Crisp on-screen size for hero Emo orb (downscales 1024px art — never upscale). */
export function getSanctuaryEmoOrbSize(scale = 1): number {
  return PixelRatio.roundToNearestPixel(124 * scale);
}
