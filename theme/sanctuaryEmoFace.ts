import { PixelRatio, type ImageSourcePropType } from 'react-native';
import type { CircadianPhase } from './circadianTheme';

const EMO_FACE_LAVENDER_TRANSPARENT: ImageSourcePropType = require('../assets/emo-face-lavender-transparent.png');

/** Plate-free Emo orb — same lavender identity in every phase and screen. */
export function getSanctuaryEmoFace(_phase: CircadianPhase): ImageSourcePropType {
  return EMO_FACE_LAVENDER_TRANSPARENT;
}

/** Primary Emo orb scale — home hero, talk companion, voice hero, cards (leaves visible). */
export const SANCTUARY_EMO_STANDARD_SCALE = 1.34;

/** Transparent PNG extends beyond the face circle — room for leaf/lace tips (not a crop). */
export const SANCTUARY_EMO_ARTWORK_BLEED = 0.26;

/** Crisp on-screen size for hero Emo orb (downscales 1024px art — never upscale). */
export function getSanctuaryEmoOrbSize(scale = 1): number {
  return PixelRatio.roundToNearestPixel(124 * scale);
}

/** Full stage including leaf/lace bleed — use for hero renders, not tight chips. */
export function getSanctuaryEmoStageSize(scale = 1): number {
  const faceSize = getSanctuaryEmoOrbSize(scale);
  const bleed = Math.round(faceSize * SANCTUARY_EMO_ARTWORK_BLEED);
  return faceSize + bleed * 2;
}
