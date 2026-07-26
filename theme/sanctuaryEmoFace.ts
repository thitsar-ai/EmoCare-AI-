import { PixelRatio, type ImageSourcePropType } from 'react-native';
import type { CircadianPhase } from './circadianTheme';

const EMO_FACE_LAVENDER_TRANSPARENT: ImageSourcePropType = require('../assets/emo-face-lavender-transparent.png');

/** Plate-free Emo orb — same lavender identity in every phase and screen. */
export function getSanctuaryEmoFace(_phase: CircadianPhase): ImageSourcePropType {
  return EMO_FACE_LAVENDER_TRANSPARENT;
}

/** Primary Emo orb scale — talk companion, cards, shared presets. */
export const SANCTUARY_EMO_STANDARD_SCALE = 1.34;

/** Home hero only — larger presence without affecting header/compact orbs. */
export const SANCTUARY_EMO_HOME_SCALE = 1.45;

/** Leaves extend further above the face than lace below — asymmetric stage padding. */
export const SANCTUARY_EMO_TOP_BLEED = 0.42;
export const SANCTUARY_EMO_BOTTOM_BLEED = 0.18;
export const SANCTUARY_EMO_SIDE_BLEED = 0.22;

/** @deprecated Uniform bleed — prefer top/side/bottom constants. */
export const SANCTUARY_EMO_ARTWORK_BLEED = 0.26;

/** Extra stage height above the square art — breathe animation + leaf tips (not layout padding). */
export const SANCTUARY_EMO_TOP_HEADROOM = 0.1;

/** Crisp on-screen size for hero Emo orb (downscales 1024px art — never upscale). */
export function getSanctuaryEmoOrbSize(scale = 1): number {
  return PixelRatio.roundToNearestPixel(124 * scale);
}

export type SanctuaryEmoStageDimensions = {
  width: number;
  height: number;
  imageSize: number;
  topBleed: number;
  bottomBleed: number;
  topHeadroom: number;
};

/** Full stage including leaf/lace bleed — square art bottom-anchored with headroom above. */
export function getSanctuaryEmoStageDimensions(scale = 1): SanctuaryEmoStageDimensions {
  const faceSize = getSanctuaryEmoOrbSize(scale);
  const sideBleed = Math.round(faceSize * SANCTUARY_EMO_SIDE_BLEED);
  const topBleed = Math.round(faceSize * SANCTUARY_EMO_TOP_BLEED);
  const bottomBleed = Math.round(faceSize * SANCTUARY_EMO_BOTTOM_BLEED);
  const imageSize = Math.max(faceSize + sideBleed * 2, faceSize + topBleed + bottomBleed);
  const topHeadroom = Math.round(faceSize * SANCTUARY_EMO_TOP_HEADROOM);
  return {
    width: imageSize,
    height: imageSize + topHeadroom,
    imageSize,
    topBleed,
    bottomBleed,
    topHeadroom,
  };
}

/** Minimum top inset for parents with overflow:hidden (glass cards, scroll rows). */
export function getSanctuaryEmoTopClipGuard(scale = 1): number {
  const { topHeadroom } = getSanctuaryEmoStageDimensions(scale);
  return Math.max(6, topHeadroom);
}

/** Stage height — use for layout min-heights (includes top leaf room). */
export function getSanctuaryEmoStageSize(scale = 1): number {
  return getSanctuaryEmoStageDimensions(scale).height;
}
