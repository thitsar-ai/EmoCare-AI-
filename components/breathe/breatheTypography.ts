import { Platform } from 'react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';

/** Typography + color tokens matched to the Breathe sanctuary mockup. */
export const BREATHE_SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

export const BREATHE_COLORS = {
  plumDeep: '#2F2348',
  plumTitle: '#2F2348',
  plumBody: '#4A3D5C',
  plumMuted: '#6E6482',
  plumSoft: '#8A7DA8',
  label: '#9A8DAD',
  labelFaint: '#A89BB8',
  meta: '#B0A4C0',
  accent: '#8B6ED4',
  accentBorder: '#9B82E8',
  pillBorder: 'rgba(123,92,255,0.22)',
  pillActiveBg: 'rgba(139,110,212,0.08)',
  safePillBg: 'rgba(255,255,255,0.78)',
  cardBorder: 'rgba(123,92,255,0.10)',
  orbInstruction: '#4A3D5C',
} as const;

export const BREATHE_GRADIENT = {
  /** Medium dusty purple → soft pastel lavender (reference mockup). */
  begin: ['#9486BD', '#B8A6DC', '#E0D4FA'] as [string, string, string],
} as const;

/** Nav chrome on Breathe — always light-surface plum tokens (not night circadian). */
export function getBreatheChromeTheme(base: CircadianTheme): CircadianTheme {
  return {
    ...base,
    isDark: false,
    text: BREATHE_COLORS.plumTitle,
    secondaryText: BREATHE_COLORS.plumBody,
    mutedText: BREATHE_COLORS.plumMuted,
    card: BREATHE_COLORS.safePillBg,
    border: BREATHE_COLORS.pillBorder,
    accent: BREATHE_COLORS.accent,
  };
}
