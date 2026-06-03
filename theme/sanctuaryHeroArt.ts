import type { ImageSourcePropType } from 'react-native';
import type { CircadianPhase } from './circadianTheme';

const HERO_DAY: ImageSourcePropType = require('../assets/sanctuary/hero-day.png');
const HERO_NIGHT: ImageSourcePropType = require('../assets/sanctuary/hero-night.png');
const TALK_DAY: ImageSourcePropType = require('../assets/sanctuary/talk-day.png');
const TALK_NIGHT: ImageSourcePropType = require('../assets/sanctuary/talk-night.png');

/** Morning & afternoon use day illustrations; evening & night use night illustrations. */
export function isSanctuaryDayArt(phase: CircadianPhase): boolean {
  return phase === 'morning' || phase === 'afternoon';
}

export function getSanctuaryHeroArt(phase: CircadianPhase): ImageSourcePropType {
  return isSanctuaryDayArt(phase) ? HERO_DAY : HERO_NIGHT;
}

export function getSanctuaryTalkArt(phase: CircadianPhase): ImageSourcePropType {
  return isSanctuaryDayArt(phase) ? TALK_DAY : TALK_NIGHT;
}

export const SANCTUARY_TALK_GRADIENT_DAY = ['#6E58C4', '#8B6ED4', '#A88BF0'] as [string, string, string];
export const SANCTUARY_TALK_GRADIENT_NIGHT = ['#2E2058', '#453575', '#5E4898'] as [string, string, string];

export function getSanctuaryTalkGradient(phase: CircadianPhase): [string, string, string] {
  return isSanctuaryDayArt(phase) ? SANCTUARY_TALK_GRADIENT_DAY : SANCTUARY_TALK_GRADIENT_NIGHT;
}

/** Both day and night heroes use full illustrated PNGs. */
export function usesSanctuaryHeroIllustration(_phase: CircadianPhase): boolean {
  return true;
}
