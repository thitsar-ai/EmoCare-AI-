import { PixelRatio, type ImageSourcePropType } from 'react-native';
import type { CircadianPhase } from './circadianTheme';

const EMO_FACE_LAVENDER_TRANSPARENT: ImageSourcePropType = require('../assets/emo-face-lavender-transparent.png');

/** Plate-free Emo orb — same lavender identity in every phase and screen. */
export function getSanctuaryEmoFace(_phase: CircadianPhase): ImageSourcePropType {
  return EMO_FACE_LAVENDER_TRANSPARENT;
}

/** Primary Emo orb scale — home hero, talk companion, voice hero, cards (leaves visible). */
export const SANCTUARY_EMO_STANDARD_SCALE = 1.34;

/** Crisp on-screen size for hero Emo orb (downscales 1024px art — never upscale). */
export function getSanctuaryEmoOrbSize(scale = 1): number {
  return PixelRatio.roundToNearestPixel(124 * scale);
}
