import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { hapticLight } from '../../utils/haptics';
import { pressChipStyle } from '../../utils/pressFeedback';

type Props = {
  theme: CircadianTheme;
  label: string;
  onPress?: () => void;
};

/** Shown when Emo has on-device check-in / journal / memory context active. */
export function EmoMemoryChip({ theme, label, onPress }: Props) {
  return (
    <Pressable
      onPress={() => {
        void hapticLight();
        onPress?.();
      }}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`Emo remembers: ${label}. Opens memory ledger.`}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: theme.isDark ? `${theme.accent}18` : `${theme.accent}12`,
          borderColor: `${theme.accent}44`,
        },
        onPress && pressChipStyle(theme.accent, pressed),
      ]}
    >
      <Sparkles size={11} color={theme.accent} strokeWidth={2.2} />
      <Text style={[styles.chipPrefix, { color: theme.accent }]}>Remembers</Text>
      <Text style={[styles.chipLabel, { color: theme.secondaryText }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 5,
    maxWidth: '100%',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 6,
  },
  chipPrefix: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
});
