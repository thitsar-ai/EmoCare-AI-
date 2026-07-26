import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { OB_MOODS, type Mood } from '../../constants/obMoods';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { tokens } from '../../theme/tokens';
import { hapticLight } from '../../utils/haptics';
import { formatMoodDeltaObservation } from '../../utils/personalMemories';
import { SERIF } from '../shared/CircadianHeroGlow';

/** Compact subset for one-tap post-Talk check — never blocks conversation. */
const QUICK_MOODS = OB_MOODS.filter((m) =>
  ['Overwhelmed', 'Heavy', 'Neutral', 'Hopeful', 'Peaceful', 'Light'].includes(m.label),
);

type Props = {
  visible: boolean;
  theme: CircadianTheme;
  moodBefore: string | null;
  onSkip: () => void;
  onComplete: (moodAfter: string) => void;
};

export function TalkFeelingCheck({ visible, theme, moodBefore, onSkip, onComplete }: Props) {
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) setPicked(null);
  }, [visible]);

  if (!visible) return null;

  const observation = picked ? formatMoodDeltaObservation(moodBefore, picked) : null;

  const pick = (mood: Mood) => {
    void hapticLight();
    setPicked(mood.label);
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.isDark ? 'rgba(255,253,250,0.08)' : 'rgba(255,253,250,0.92)',
          borderColor: tokens.glass.cardBorder,
        },
      ]}
      accessibilityRole="summary"
    >
      {observation ? (
        <>
          <Text style={[styles.title, { color: theme.text }]}>A quiet notice</Text>
          <Text style={[styles.observation, { color: theme.secondaryText }]}>{observation}</Text>
          <Pressable
            onPress={() => {
              if (picked) onComplete(picked);
              else onSkip();
            }}
            style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.75 }]}
            accessibilityRole="button"
            accessibilityLabel="Done"
          >
            <Text style={[styles.doneLabel, { color: theme.accent }]}>Done</Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={[styles.title, { color: theme.text }]}>How are you feeling now?</Text>
          <Text style={[styles.sub, { color: theme.secondaryText }]}>Optional — one tap is enough.</Text>
          <View style={styles.moodRow}>
            {QUICK_MOODS.map((mood) => (
              <Pressable
                key={mood.label}
                onPress={() => pick(mood)}
                style={({ pressed }) => [
                  styles.moodChip,
                  {
                    borderColor: tokens.border.standard,
                    backgroundColor: mood.accentBg ?? 'transparent',
                  },
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={mood.label}
              >
                <Text style={styles.moodEmoji}>{mood.emoji}</Text>
                <Text style={[styles.moodLabel, { color: theme.text }]} numberOfLines={1}>
                  {mood.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={() => {
              void hapticLight();
              onSkip();
            }}
            style={({ pressed }) => [styles.skipBtn, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Skip feeling check"
          >
            <Text style={[styles.skipLabel, { color: theme.secondaryText }]}>Skip</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
  },
  title: {
    fontFamily: SERIF,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: 0.15,
  },
  sub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  moodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  moodChip: {
    width: '30%',
    flexGrow: 1,
    minWidth: 96,
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  moodEmoji: {
    fontSize: 18,
  },
  moodLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  skipBtn: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  observation: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 6,
    marginBottom: 10,
  },
  doneBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  doneLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
});
