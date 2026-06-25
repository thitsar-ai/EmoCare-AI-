import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Sparkles } from 'lucide-react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { hapticLight } from '../../utils/haptics';
import { pressChipStyle } from '../../utils/pressFeedback';

type Props = {
  theme: CircadianTheme;
  moodLabel: string;
  onPress?: () => void;
};

/** Quiet memory line under the sanctuary greeting — e.g. "Emo remembers: Peaceful". */
export function SanctuaryMemoryBadge({ theme, moodLabel, onPress }: Props) {
  return (
    <Pressable
      onPress={() => {
        if (!onPress) return;
        void hapticLight();
        onPress();
      }}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={`Emo remembers ${moodLabel}`}
      style={({ pressed }) => [
        styles.badge,
        {
          backgroundColor: `${theme.accent}10`,
          borderColor: `${theme.accent}33`,
        },
        onPress && pressChipStyle(theme.accent, pressed),
      ]}
    >
      <Sparkles size={11} color={theme.accent} strokeWidth={2.2} />
      <Text style={[styles.text, { color: theme.secondaryText }]} numberOfLines={2}>
        Emo remembers:{' '}
        <Text style={[styles.mood, { color: theme.text }]}>{moodLabel}</Text>
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexWrap: 'wrap',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 12,
  },
  text: {
    fontSize: 12,
    fontWeight: '500',
    flexShrink: 1,
  },
  mood: {
    fontWeight: '700',
  },
});

/** First meaningful mood fragment from personal-context chip label. */
export function memoryMoodFromChipLabel(chipLabel: string | null | undefined): string | null {
  if (!chipLabel || chipLabel === 'Your journey on this device') return null;
  const mood = chipLabel.split(' · ')[0]?.trim();
  return mood || null;
}
