import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { BURMESE_UI } from '../../utils/emoBurmese';
import {
  BURMESE_FEEDBACK_OPTIONS,
  hashResponseRef,
  saveBurmeseFeedback,
  type BurmeseFeedbackCategory,
} from '../../utils/emoBurmeseFeedback';
import { hapticLight } from '../../utils/haptics';

type Props = {
  theme: CircadianTheme;
  responseText: string;
  intent?: string;
};

const LABEL_BY_KEY: Record<string, string> = {
  feedbackHelpful: BURMESE_UI.feedbackHelpful,
  feedbackNotNatural: BURMESE_UI.feedbackNotNatural,
  feedbackWrongMeaning: BURMESE_UI.feedbackWrongMeaning,
  feedbackSpelling: BURMESE_UI.feedbackSpelling,
};

/** Compact Burmese quality feedback under a reply (optional). */
export function BurmeseReplyFeedback({ theme, responseText, intent }: Props) {
  const [sent, setSent] = useState<BurmeseFeedbackCategory | null>(null);

  if (!responseText?.trim()) return null;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.hint, { color: theme.secondaryText }]}>
        {sent ? 'မှတ်ချက် ပေးပြီးပါပြီ' : 'ဒီအဖြေအတွက်'}
      </Text>
      <View style={styles.row}>
        {BURMESE_FEEDBACK_OPTIONS.map((opt) => {
          const selected = sent === opt.id;
          return (
            <Pressable
              key={opt.id}
              disabled={Boolean(sent)}
              onPress={() => {
                void hapticLight();
                setSent(opt.id);
                void saveBurmeseFeedback({
                  category: opt.id,
                  responseHash: hashResponseRef(responseText),
                  intent,
                });
              }}
              style={[
                styles.chip,
                {
                  borderColor: selected ? theme.accent : theme.border,
                  backgroundColor: selected ? `${theme.accent}22` : 'transparent',
                  opacity: sent && !selected ? 0.45 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={LABEL_BY_KEY[opt.labelKey]}
            >
              <Text
                style={{
                  color: selected ? theme.accent : theme.secondaryText,
                  fontSize: 11,
                  fontWeight: selected ? '700' : '500',
                }}
              >
                {LABEL_BY_KEY[opt.labelKey]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 6, marginBottom: 2, gap: 4 },
  hint: { fontSize: 11 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
});
