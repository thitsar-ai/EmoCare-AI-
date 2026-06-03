import type { CircadianPhase, CircadianTheme } from './circadianTheme';
import { getSanctuaryTalkGradient, isSanctuaryDayArt } from './sanctuaryHeroArt';

/** Horizontal CTA gradient — matches Talk to Emo hero bar. */
export function getSanctuaryButtonGradient(phase: CircadianPhase): [string, string] {
  const [start, , end] = getSanctuaryTalkGradient(phase);
  return [start, end];
}

export function getSanctuaryButtonGradientDisabled(phase: CircadianPhase): [string, string] {
  if (isSanctuaryDayArt(phase)) {
    return ['#B8A8E8', '#C9BEF2'];
  }
  return ['#4A3D6B', '#3D3560'];
}

/** Link text, eyebrows, accents tied to the talk card lavender. */
export function getSanctuaryLavenderAccent(phase: CircadianPhase): string {
  return getSanctuaryTalkGradient(phase)[1];
}

export function getSanctuaryLavenderDeep(phase: CircadianPhase): string {
  return getSanctuaryTalkGradient(phase)[0];
}

export function getSanctuaryLavenderBorder(phase: CircadianPhase): string {
  return isSanctuaryDayArt(phase) ? 'rgba(110, 88, 196, 0.32)' : 'rgba(139, 110, 212, 0.36)';
}

export function getSanctuaryLavenderFieldBg(phase: CircadianPhase): string {
  return isSanctuaryDayArt(phase) ? 'rgba(255, 255, 255, 0.94)' : 'rgba(255, 255, 255, 0.1)';
}

export function getSanctuaryLavenderLabel(phase: CircadianPhase): string {
  return isSanctuaryDayArt(phase) ? '#6E58C4' : '#C4B7FF';
}

/** Icon / link accents on sanctuary surfaces — readable on dark night canvas. */
export function getSanctuaryIconAccent(theme: CircadianTheme): string {
  return theme.isDark ? theme.accent : getSanctuaryLavenderDeep(theme.phase);
}

export function getSanctuaryIconLink(theme: CircadianTheme): string {
  return theme.isDark ? theme.secondaryText : getSanctuaryLavenderAccent(theme.phase);
}

export function getSanctuaryLabelAccent(theme: CircadianTheme): string {
  return theme.isDark ? theme.secondaryText : getSanctuaryLavenderDeep(theme.phase);
}
