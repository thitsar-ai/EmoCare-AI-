import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { tokens } from '../../theme/tokens';
import { hapticLight } from '../../utils/haptics';
import {
  inferPersonalMemoryCategory,
  PERSONAL_MEMORY_CATEGORIES,
} from '../../utils/personalMemories';
import { SERIF } from '../shared/CircadianHeroGlow';

type Props = {
  visible: boolean;
  theme: CircadianTheme;
  suggestedText: string;
  onRemember: (text: string, category: string) => void;
  onNotNow: () => void;
};

export function SaveMemoryPrompt({
  visible,
  theme,
  suggestedText,
  onRemember,
  onNotNow,
}: Props) {
  const [text, setText] = useState(suggestedText);
  const [category, setCategory] = useState(inferPersonalMemoryCategory(suggestedText));
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setText(suggestedText);
    setCategory(inferPersonalMemoryCategory(suggestedText));
    setEditing(false);
  }, [visible, suggestedText]);

  if (!visible) return null;

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
      <Text style={[styles.title, { color: theme.text }]}>Would you like me to remember this?</Text>
      {editing ? (
        <TextInput
          value={text}
          onChangeText={setText}
          style={[styles.input, { color: theme.text, borderColor: tokens.border.medium }]}
          multiline
          maxLength={280}
          autoFocus
          accessibilityLabel="Memory text"
        />
      ) : (
        <Pressable onPress={() => setEditing(true)} accessibilityRole="button" accessibilityLabel="Edit memory text">
          <Text style={[styles.suggestion, { color: theme.secondaryText }]} numberOfLines={3}>
            {text}
          </Text>
          <Text style={[styles.editHint, { color: theme.accent }]}>Edit</Text>
        </Pressable>
      )}

      <View style={styles.cats}>
        {PERSONAL_MEMORY_CATEGORIES.map((cat) => {
          const active = cat.id === category;
          return (
            <Pressable
              key={cat.id}
              onPress={() => {
                void hapticLight();
                setCategory(cat.id);
              }}
              style={[
                styles.catChip,
                {
                  backgroundColor: active ? 'rgba(61,42,107,0.12)' : 'transparent',
                  borderColor: active ? tokens.brand.accent : tokens.border.standard,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={cat.label}
            >
              <Text style={[styles.catLabel, { color: active ? theme.text : theme.secondaryText }]}>
                {cat.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            void hapticLight();
            onNotNow();
          }}
          style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Not now"
        >
          <Text style={[styles.secondaryLabel, { color: theme.secondaryText }]}>Not now</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            void hapticLight();
            onRemember(text.trim(), category);
          }}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: tokens.brand.accent },
            pressed && { opacity: 0.88 },
            !text.trim() && styles.disabled,
          ]}
          disabled={!text.trim()}
          accessibilityRole="button"
          accessibilityLabel="Remember"
        >
          <Text style={styles.primaryLabel}>Remember</Text>
        </Pressable>
      </View>
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
    marginBottom: 8,
    letterSpacing: 0.15,
  },
  suggestion: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 4,
  },
  editHint: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  input: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
    textAlignVertical: 'top',
  },
  cats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 14,
  },
  catChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  catLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  primaryBtn: {
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  primaryLabel: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.45,
  },
});
