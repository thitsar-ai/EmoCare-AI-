import { Platform, type ViewStyle } from 'react-native';
import type { CircadianTheme } from '../theme/circadianTheme';

function glowShadow(color: string, opacity: number, radius: number, y = 0): ViewStyle {
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: y },
    shadowOpacity: opacity,
    shadowRadius: radius,
    ...(Platform.OS === 'android' ? { elevation: Math.round(radius / 2) } : null),
  };
}

/** Card rows — quick actions, insights list, task cards. */
export function pressCardStyle(
  theme: CircadianTheme,
  pressed: boolean,
  accent?: string,
): ViewStyle {
  const glow = accent ?? theme.accent;
  if (!pressed) return {};
  return {
    transform: [{ scale: 0.985 }],
    borderColor: `${glow}AA`,
    borderWidth: 1,
    backgroundColor: theme.isDark ? `${glow}20` : `${glow}14`,
    ...glowShadow(glow, theme.isDark ? 0.58 : 0.4, 16),
  };
}

/** Hero cards on gradients (Talk to Emo). */
export function pressHeroCardStyle(pressed: boolean): ViewStyle {
  if (!pressed) return {};
  return {
    transform: [{ scale: 0.985 }],
    ...glowShadow('#FFFFFF', 0.42, 22, 2),
  };
}

/** Category / mood / small chips. */
export function pressChipStyle(accent: string, pressed: boolean): ViewStyle {
  if (!pressed) return {};
  return {
    transform: [{ scale: 0.95 }],
    backgroundColor: `${accent}30`,
    borderColor: accent,
    ...glowShadow(accent, 0.52, 12),
  };
}

/** Top nav chrome circular buttons. */
export function pressNavChromeStyle(theme: CircadianTheme, pressed: boolean): ViewStyle {
  if (!pressed) return {};
  return {
    transform: [{ scale: 0.9 }],
    backgroundColor: theme.isDark ? `${theme.accent}30` : `${theme.accent}20`,
    borderColor: `${theme.accent}80`,
    ...glowShadow(theme.accent, 0.52, 14),
  };
}

/** Bottom tab bar items. */
export function pressTabStyle(theme: CircadianTheme, pressed: boolean): ViewStyle {
  if (!pressed) return {};
  return {
    transform: [{ scale: 0.94 }],
    backgroundColor: theme.isDark ? `${theme.accent}24` : `${theme.accent}18`,
    borderRadius: 14,
    ...glowShadow(theme.accent, 0.48, 12),
  };
}

/** Lavender gradient primary CTAs. */
export function pressPrimaryStyle(theme: CircadianTheme, pressed: boolean): ViewStyle {
  if (!pressed) return {};
  return {
    transform: [{ scale: 0.975 }],
    ...glowShadow(theme.accent, 0.72, 22, 4),
  };
}

export function primaryRestingShadow(theme: CircadianTheme): ViewStyle {
  return glowShadow(theme.accent, theme.isDark ? 0.4 : 0.3, 12, 3);
}

/** Inline text links (Edit, Begin →). */
export function pressLinkStyle(theme: CircadianTheme, pressed: boolean): ViewStyle {
  return {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    ...(pressed
      ? {
          backgroundColor: `${theme.accent}24`,
          transform: [{ scale: 0.97 }],
          ...glowShadow(theme.accent, 0.35, 8),
        }
      : null),
  };
}

/** Circular check / mood dots. */
export function pressDotStyle(theme: CircadianTheme, pressed: boolean, accent?: string): ViewStyle {
  const glow = accent ?? theme.accent;
  if (!pressed) return {};
  return {
    transform: [{ scale: 0.92 }],
    borderColor: glow,
    backgroundColor: `${glow}28`,
    ...glowShadow(glow, 0.55, 10),
  };
}
