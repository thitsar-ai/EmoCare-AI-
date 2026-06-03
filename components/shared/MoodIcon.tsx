import React from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { Mood } from '../../constants/obMoods';
import { useCircadianTheme } from '../../theme/circadianTheme';

export const MOOD_ICON_BADGE_FULL = 48;
export const MOOD_ICON_BADGE_WEEK = 40;

export function MoodIcon({ mood, size = 20 }: { mood: Mood; size?: number }) {
  const theme = useCircadianTheme();
  const Icon = mood.Icon;
  if (!Icon) {
    return <Text style={[styles.emoji, { fontSize: size * 0.85 }]}>{mood.emoji}</Text>;
  }
  return (
    <Icon
      size={size}
      color={mood.iconColor ?? '#F5F3FF'}
      weight={mood.iconWeight ?? 'duotone'}
      duotoneColor={mood.accentColor ?? mood.iconColor ?? '#A78BFA'}
      duotoneOpacity={theme.isDark ? 0.62 : 0.42}
    />
  );
}

export function MoodIconBadge({
  mood,
  variant = 'full',
  active = false,
  style,
}: {
  mood: Mood;
  variant?: 'full' | 'week';
  active?: boolean;
  style?: ViewStyle;
}) {
  const theme = useCircadianTheme();
  const badgeSize = variant === 'week' ? MOOD_ICON_BADGE_WEEK : MOOD_ICON_BADGE_FULL;
  const iconSize = Math.round(badgeSize * 0.5);
  const accent = mood.accentColor ?? mood.iconColor ?? '#A78BFA';
  const inactiveBorder = theme.isDark ? `${accent}99` : `${mood.iconColor ?? accent}55`;

  return (
    <View
      style={[
        styles.badge,
        {
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
          backgroundColor: mood.iconBg ?? 'rgba(139,92,246,0.4)',
          borderColor: active ? accent : inactiveBorder,
          borderWidth: active ? 2 : 1,
          shadowColor: accent,
          shadowOpacity: active ? (theme.isDark ? 0.65 : 0.55) : theme.isDark ? 0.48 : 0.38,
          shadowRadius: active ? 9 : 6,
          shadowOffset: { width: 0, height: 2 },
        },
        style,
      ]}
    >
      <MoodIcon mood={mood} size={iconSize} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  emoji: { textAlign: 'center' },
});
