import { Platform, type ViewStyle } from 'react-native';
import { tokens } from './tokens';

/** Frosted card surfaces — Sanctuary web .sx-cta-card parity on canvas gradient. */
export const glassSurfaces = {
  canvas: tokens.bg.canvasTop,
  primary: tokens.glass.primary,
  lavender: tokens.glass.lavender,
  elevated: tokens.glass.elevated,
  border: tokens.glass.cardBorder,
  shadow: tokens.glass.shadow,
  radius: tokens.glass.radius,
  blurIntensity: tokens.glass.blur,
  waitlistTop: tokens.brand.gradStart,
  waitlistBottom: tokens.brand.gradMid,
} as const;

/** Check-in mood grid — frosted tiles on sanctuary canvas. */
export const moodCheckInGlass = {
  background: tokens.bg.card,
  backgroundSelected: tokens.brand.gradMid2,
  border: tokens.glass.cardBorder,
  borderSelected: tokens.border.active,
  shadowColor: tokens.shadow.card,
  shadowSelected: tokens.shadow.floating,
  blurIntensity: tokens.glass.blur,
  radius: 24,
} as const;

/** Shared lavender selection chrome for tappable cards across the app. */
export const selectableCardTokens = {
  background: tokens.bg.card,
  backgroundSelected: tokens.brand.gradMid2,
  border: tokens.glass.cardBorder,
  borderSelected: tokens.border.active,
  labelSelected: tokens.text.primary,
  radius: moodCheckInGlass.radius,
} as const;

export function selectableCardStyle(selected = false): ViewStyle {
  return {
    backgroundColor: selected
      ? selectableCardTokens.backgroundSelected
      : selectableCardTokens.background,
    borderColor: selected ? selectableCardTokens.borderSelected : selectableCardTokens.border,
    borderWidth: selected ? 1.5 : 1,
    borderRadius: selectableCardTokens.radius,
  };
}

export function selectableLabelColor(selected: boolean, fallback: string): string {
  return selected ? selectableCardTokens.labelSelected : fallback;
}

export function moodCheckInCardShadow(selected = false): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: selected ? moodCheckInGlass.shadowSelected : moodCheckInGlass.shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: selected ? 16 : 24,
    },
    android: { elevation: selected ? 3 : 2 },
    default: {},
  }) as ViewStyle;
}

/** Today + Insights dashboard cards — same frosted glass as all cards. */
export const todayInsightsGlass = {
  fill: tokens.bg.card,
  border: tokens.glass.cardBorder,
  shadowColor: tokens.shadow.card,
  blurIntensity: tokens.glass.blur,
  radius: 24,
} as const;

export function todayInsightsCardShadow(): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: todayInsightsGlass.shadowColor,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 24,
    },
    android: { elevation: 2 },
    default: {},
  }) as ViewStyle;
}

export const todayInsightsCardBase: ViewStyle = {
  borderRadius: todayInsightsGlass.radius,
  borderWidth: 1,
  borderColor: todayInsightsGlass.border,
  overflow: 'hidden',
  ...todayInsightsCardShadow(),
};

export type GlassSurfaceVariant = 'primary' | 'lavender' | 'elevated' | 'todayInsights' | 'waitlist';

export function glassBackground(variant: GlassSurfaceVariant = 'primary'): string {
  if (variant === 'waitlist') return glassSurfaces.waitlistTop;
  if (variant === 'elevated') return glassSurfaces.elevated;
  return glassSurfaces.primary;
}

/** Shared card chrome — frosted glass with soft shadow. */
export function glassCardShadow(): ViewStyle {
  return Platform.select({
    ios: {
      shadowColor: glassSurfaces.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 1,
      shadowRadius: 24,
    },
    android: { elevation: 2 },
    default: {},
  }) as ViewStyle;
}

export const glassCardBase: ViewStyle = {
  borderRadius: glassSurfaces.radius,
  borderWidth: 1,
  borderColor: glassSurfaces.border,
  overflow: 'hidden',
  ...glassCardShadow(),
};
