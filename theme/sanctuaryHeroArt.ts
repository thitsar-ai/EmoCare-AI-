import type { ImageSourcePropType } from 'react-native';
import type { CircadianPhase } from './circadianTheme';
import { BRAND_GRADIENT, BRAND_GRADIENT_DISABLED } from './tokens';

const HERO_DAY: ImageSourcePropType = require('../assets/sanctuary/hero-day.png');
const TALK_DAY: ImageSourcePropType = require('../assets/sanctuary/talk-day.png');

/** Sanctuary v1.0 — always light lavender art. */
export function isSanctuaryDayArt(_phase: CircadianPhase): boolean {
  return true;
}

export function getSanctuaryHeroArt(_phase: CircadianPhase): ImageSourcePropType {
  return HERO_DAY;
}

export function getSanctuaryTalkArt(_phase: CircadianPhase): ImageSourcePropType {
  return TALK_DAY;
}

export const SANCTUARY_TALK_GRADIENT_DAY = BRAND_GRADIENT;
export const SANCTUARY_TALK_GRADIENT_NIGHT = BRAND_GRADIENT;

export function getSanctuaryTalkGradient(_phase: CircadianPhase): [string, string] {
  return [...BRAND_GRADIENT];
}

export function getSanctuaryTalkGradientDisabled(_phase: CircadianPhase): [string, string] {
  return [...BRAND_GRADIENT_DISABLED];
}

/** Both day and night heroes use full illustrated PNGs. */
export function usesSanctuaryHeroIllustration(_phase: CircadianPhase): boolean {
  return true;
}
