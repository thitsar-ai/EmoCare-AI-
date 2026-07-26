import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { tokens } from '../../theme/tokens';
import { hapticLight } from '../../utils/haptics';
import { MEMORY_CATEGORIES, resolveMemoryCategory } from '../../utils/memoryCategories';
import { SERIF } from '../shared/CircadianHeroGlow';

type Props = {
  visible: boolean;
  theme: CircadianTheme;
  suggestedText: string;
  categoryLabel?: string | null;
  /** Explicit "Remember that…" request uses softer title. */
  explicitRemember?: boolean;
  onRemember: (text: string, categoryId: string) => void;
  onNotNow: () => void;
};

export function SaveMemoryPrompt({
  visible,
  theme,
  suggestedText,
  categoryLabel,
  explicitRemember = false,
  onRemember,
  onNotNow,
}: Props) {
  const initialCat = resolveMemoryCategory(categoryLabel || 'helps') || MEMORY_CATEGORIES[2];
  const [text, setText] = useState(suggestedText);
  const [categoryId, setCategoryId] = useState(initialCat.id);
  const [editing, setEditing] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setText(suggestedText);
    const cat = resolveMemoryCategory(categoryLabel || 'helps') || MEMORY_CATEGORIES[2];
    setCategoryId(cat.id);
    setEditing(false);
    setPickerOpen(false);
  }, [visible, suggestedText, categoryLabel]);

  if (!visible) return null;

  const cat = resolveMemoryCategory(categoryId) || MEMORY_CATEGORIES[2];
  const title = explicitRemember
    ? 'Of course. Save this memory?'
    : 'Would you like me to remember this?';

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: '#FFFCFA',
          borderColor: tokens.glass.cardBorder,
        },
      ]}
      accessibilityRole="summary"
    >
      <Text style={[styles.title, { color: theme.text }]}>
        <Text style={styles.sparkle}>✨ </Text>
        {title}
      </Text>

      {editing ? (
        <TextInput
          value={text}
          onChangeText={setText}
          style={[styles.input, { color: theme.text, borderColor: tokens.border.medium }]}
          multiline
          maxLength={120}
          autoFocus
          accessibilityLabel="Proposed memory"
        />
      ) : (
        <Pressable
          onPress={() => setEditing(true)}
          style={styles.quoteBox}
          accessibilityRole="button"
          accessibilityLabel="Edit proposed memory"
        >
          <Text style={[styles.quote, { color: theme.text }]} numberOfLines={3}>
            “{text}”
          </Text>
        </Pressable>
      )}

      <Pressable
        onPress={() => {
          void hapticLight();
          setPickerOpen(true);
        }}
        style={styles.catRow}
        accessibilityRole="button"
        accessibilityLabel={`${cat.label}, change category`}
      >
        <Text style={[styles.catLine, { color: tokens.brand.accent }]}>
          {cat.label} · Edit
        </Text>
      </Pressable>

      <View style={styles.actions}>
        <Pressable
          onPress={() => {
            void hapticLight();
            onNotNow();
          }}
          style={({ pressed }) => [
            styles.secondaryBtn,
            { borderColor: tokens.brand.accent },
            pressed && { opacity: 0.75 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Not now"
        >
          <Text style={[styles.secondaryLabel, { color: tokens.brand.accent }]}>Not now</Text>
        </Pressable>
        <Pressable
          onPress={() => {
            void hapticLight();
            onRemember(text.trim(), categoryId);
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

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.pickerOverlay} onPress={() => setPickerOpen(false)}>
          <View style={[styles.pickerCard, { backgroundColor: '#FFFCFA' }]}>
            <Text style={[styles.pickerTitle, { color: theme.text }]}>Choose a category</Text>
            <ScrollView style={styles.pickerScroll}>
              {MEMORY_CATEGORIES.map((c) => (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    void hapticLight();
                    setCategoryId(c.id);
                    setPickerOpen(false);
                  }}
                  style={styles.pickerItem}
                >
                  <Text style={{ color: theme.text, fontWeight: c.id === categoryId ? '700' : '500' }}>
                    {c.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
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
    marginBottom: 10,
    letterSpacing: 0.15,
  },
  sparkle: {
    fontSize: 15,
  },
  quoteBox: {
    backgroundColor: 'rgba(61,42,107,0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 8,
  },
  quote: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
  },
  catRow: {
    marginBottom: 14,
  },
  catLine: {
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 8,
    textAlignVertical: 'top',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  secondaryBtn: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  secondaryLabel: {
    fontSize: 15,
    fontWeight: '700',
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
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  pickerCard: {
    borderRadius: 18,
    maxHeight: '70%',
    padding: 16,
  },
  pickerTitle: {
    fontFamily: SERIF,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  pickerScroll: {
    maxHeight: 360,
  },
  pickerItem: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(61,42,107,0.12)',
  },
});
