import { PixelRatio, type ImageSourcePropType } from 'react-native';
import type { CircadianPhase } from './circadianTheme';

const EMO_FACE_LAVENDER_TRANSPARENT: ImageSourcePropType = require('../assets/emo-face-lavender-transparent.png');
const EMO_FACE_NIGHT_KEYED: ImageSourcePropType = require('../assets/emo-face-night-keyed.png');

/** Plate-free Emo face for dark sanctuary UI — sharp source, true alpha, no visible frame. */
export function getSanctuaryEmoFace(phase: CircadianPhase): ImageSourcePropType {
  if (phase === 'night') {
    return EMO_FACE_NIGHT_KEYED;
  }
  return EMO_FACE_LAVENDER_TRANSPARENT;
}

/** Crisp on-screen size for hero Emo orb (downscales 1024px art — never upscale). */
export function getSanctuaryEmoOrbSize(scale = 1): number {
  return PixelRatio.roundToNearestPixel(124 * scale);
}
