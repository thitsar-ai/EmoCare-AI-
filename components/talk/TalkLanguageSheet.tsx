import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Globe } from 'lucide-react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { DARK_MENU_SURFACE, MENU_SOLID, tokens } from '../../theme/tokens';
import { hapticLight } from '../../utils/haptics';
import { CHAT_LANGUAGE_OPTIONS } from '../../utils/chatLanguage';

type ChatLanguageId = 'auto' | 'en' | 'my' | 'es';

type Props = {
  visible: boolean;
  theme: CircadianTheme;
  value: ChatLanguageId;
  onClose: () => void;
  onSelect: (id: ChatLanguageId) => void;
};

const HINTS: Record<ChatLanguageId, string> = {
  auto: 'Match the language you write in',
  en: 'Emo replies in English',
  my: 'Emo replies in natural Burmese',
  es: 'Emo replies in Spanish',
};

export function TalkLanguageSheet({ visible, theme, value, onClose, onSelect }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.anchor}>
          <Pressable
            style={[styles.sheet, { backgroundColor: MENU_SOLID, borderColor: DARK_MENU_SURFACE.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.headerRow}>
              <View style={[styles.iconWrap, { backgroundColor: `${theme.accent}22` }]}>
                <Globe size={18} color={theme.accent} strokeWidth={2.2} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.title, { color: DARK_MENU_SURFACE.text }]}>Emo language</Text>
                <Text style={[styles.hint, { color: DARK_MENU_SURFACE.mutedText }]}>
                  Choose how Emo talks with you. This is saved for Talk and Oracle.
                </Text>
              </View>
            </View>

            <View style={styles.list}>
              {CHAT_LANGUAGE_OPTIONS.map((option, index) => {
                const selected = value === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => {
                      void hapticLight();
                      onSelect(option.id);
                      onClose();
                    }}
                    style={[
                      styles.row,
                      index < CHAT_LANGUAGE_OPTIONS.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: DARK_MENU_SURFACE.border,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Emo language ${option.label}`}
                  >
                    <View style={styles.rowText}>
                      <Text
                        style={{
                          color: selected ? theme.accent : DARK_MENU_SURFACE.text,
                          fontWeight: selected ? '700' : '600',
                          fontSize: 16,
                        }}
                      >
                        {option.label}
                      </Text>
                      <Text style={{ color: DARK_MENU_SURFACE.mutedText, fontSize: 12, marginTop: 3 }}>
                        {HINTS[option.id]}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.radio,
                        {
                          borderColor: selected ? theme.accent : DARK_MENU_SURFACE.border,
                          backgroundColor: selected ? theme.accent : 'transparent',
                        },
                      ]}
                    />
                  </Pressable>
                );
              })}
            </View>

            <Pressable onPress={onClose} style={styles.doneBtn}>
              <Text style={{ color: tokens.brand.ctaStart, fontWeight: '700', fontSize: 15 }}>Done</Text>
            </Pressable>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    padding: 24,
  },
  anchor: { width: '100%' },
  sheet: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
  },
  flex: { flex: 1 },
  headerRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  hint: { fontSize: 12, lineHeight: 18 },
  list: { marginTop: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  rowText: { flex: 1, minWidth: 0 },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  doneBtn: {
    alignSelf: 'flex-end',
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginTop: 4,
  },
});
