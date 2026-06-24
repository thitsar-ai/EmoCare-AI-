import type { CircadianPhase, CircadianTheme } from './circadianTheme';
import { BRAND_CTA_GRADIENT, BRAND_GRADIENT_DISABLED, tokens } from './tokens';

/** Signature EmoCare CTA gradient. */
export function getSanctuaryButtonGradient(phase: CircadianPhase): [string, string] {
  return [...BRAND_CTA_GRADIENT];
}

export function getSanctuaryButtonGradientDisabled(phase: CircadianPhase): [string, string] {
  return [...BRAND_GRADIENT_DISABLED];
}

export function getSanctuaryButtonGradientPressed(phase: CircadianPhase): [string, string] {
  const pressed = tokens.brand.ctaPressed;
  return [pressed, pressed];
}

/** Link text, eyebrows, accents tied to brand lavender. */
export function getSanctuaryLavenderAccent(_phase: CircadianPhase): string {
  return tokens.brand.accent;
}

export function getSanctuaryLavenderDeep(_phase: CircadianPhase): string {
  return tokens.brand.gradEnd;
}

export function getSanctuaryLavenderBorder(_phase: CircadianPhase): string {
  return tokens.glass.border;
}

export function getSanctuaryLavenderFieldBg(_phase: CircadianPhase): string {
  return tokens.bg.card;
}

export function getSanctuaryLavenderLabel(_phase: CircadianPhase): string {
  return tokens.brand.accent;
}

export function getSanctuaryIconAccent(theme: CircadianTheme): string {
  return tokens.brand.accent;
}

export function getSanctuaryIconLink(theme: CircadianTheme): string {
  return getSanctuaryLavenderAccent(theme.phase);
}

export function getSanctuaryLabelAccent(theme: CircadianTheme): string {
  return tokens.brand.accent;
}
