import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { moodCheckInCardShadow, moodCheckInGlass, selectableLabelColor } from '../../theme/glassSurfaces';
import { hapticLight } from '../../utils/haptics';

const SERIF = 'Georgia';

type Props = {
  theme: CircadianTheme;
  value: number;
  onChange: (value: number) => void;
};

const INTENSITY_LABELS: Record<number, string> = {
  1: 'Whisper',
  2: 'Soft',
  3: 'Present',
  4: 'Strong',
  5: 'Deep',
};

/** 1–5 feeling strength — shown after mood selection. */
export function FeelingIntensityPicker({ theme, value, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: theme.text }]}>How strong is this feeling today?</Text>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((level) => {
          const active = value === level;
          return (
            <Pressable
              key={level}
              onPress={() => {
                void hapticLight();
                onChange(level);
              }}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Intensity ${level}, ${INTENSITY_LABELS[level]}`}
              style={[
                styles.pill,
                moodCheckInCardShadow(active),
                {
                  borderColor: active ? moodCheckInGlass.borderSelected : moodCheckInGlass.border,
                  backgroundColor: active
                    ? moodCheckInGlass.backgroundSelected
                    : moodCheckInGlass.background,
                },
              ]}
            >
              <Text style={[styles.pillNum, { color: selectableLabelColor(active, theme.secondaryText) }]}>
                {level}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.hint, { color: theme.mutedText }]}>{INTENSITY_LABELS[value]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 22,
    alignItems: 'center',
  },
  title: {
    fontFamily: SERIF,
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  pill: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillNum: {
    fontSize: 16,
    fontWeight: '700',
  },
  hint: {
    marginTop: 10,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});
