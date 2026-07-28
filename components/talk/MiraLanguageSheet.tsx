import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Globe } from 'lucide-react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { DARK_MENU_SURFACE, MENU_SOLID } from '../../theme/tokens';
import { hapticLight } from '../../utils/haptics';
import { MIRA_LANGUAGE_OPTIONS } from '../../utils/miraLanguage';
import { useUiCopy } from '../i18n/UiCopyProvider';

type MiraLanguageId = (typeof MIRA_LANGUAGE_OPTIONS)[number]['id'];

type Props = {
  visible: boolean;
  theme: CircadianTheme;
  value: MiraLanguageId;
  onClose: () => void;
  onSelect: (id: MiraLanguageId) => void;
};

const HINTS: Record<MiraLanguageId, string> = {
  auto: 'Match the language you write in',
  en: 'Mira replies in English',
  my: 'Mira replies in natural Burmese',
  id: 'Mira replies in Bahasa Indonesia',
  es: 'Mira replies in Spanish',
  'pt-BR': 'Mira replies in Brazilian Portuguese',
  fr: 'Mira replies in French',
};

export function MiraLanguageSheet({ visible, theme, value, onClose, onSelect }: Props) {
  const { t, locale } = useUiCopy();
  const myanmar = locale === 'my';
  const hintFor = (id: MiraLanguageId) => {
    if (!myanmar) return HINTS[id];
    if (id === 'auto') return t('mira.langAuto');
    if (id === 'en') return t('mira.langEnglish');
    if (id === 'my') return t('mira.langBurmese');
    return HINTS[id];
  };
  const labelFor = (id: MiraLanguageId, fallback: string) => {
    if (!myanmar) return fallback;
    if (id === 'auto') return 'အလိုအလျောက်';
    return fallback;
  };

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
                <Text
                  style={[
                    styles.title,
                    myanmar && { letterSpacing: 0, lineHeight: 26 },
                    { color: DARK_MENU_SURFACE.text },
                  ]}
                >
                  {myanmar ? t('mira.langSheetTitle') : t('miraLang.title')}
                </Text>
                <Text
                  style={[
                    styles.hint,
                    myanmar && { letterSpacing: 0, lineHeight: 20 },
                    { color: DARK_MENU_SURFACE.mutedText },
                  ]}
                >
                  {t('miraLang.hint')}
                </Text>
              </View>
            </View>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {MIRA_LANGUAGE_OPTIONS.map((option, index) => {
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
                      index < MIRA_LANGUAGE_OPTIONS.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: DARK_MENU_SURFACE.border,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`Mira language ${option.label}`}
                  >
                    <View style={styles.rowText}>
                      <Text
                        style={{
                          color: selected ? theme.accent : DARK_MENU_SURFACE.text,
                          fontWeight: selected ? '700' : '600',
                          fontSize: 16,
                          letterSpacing: myanmar ? 0 : undefined,
                        }}
                      >
                        {labelFor(option.id, option.label)}
                      </Text>
                      <Text
                        style={{
                          color: DARK_MENU_SURFACE.mutedText,
                          fontSize: 12,
                          marginTop: 3,
                          letterSpacing: myanmar ? 0 : undefined,
                          lineHeight: myanmar ? 18 : undefined,
                        }}
                      >
                        {hintFor(option.id)}
                      </Text>
                    </View>
                    {selected ? (
                      <View style={[styles.dot, { backgroundColor: theme.accent }]} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
  anchor: { width: '100%', maxHeight: '80%' },
  sheet: { borderRadius: 18, borderWidth: 1, padding: 20, maxHeight: '100%' },
  flex: { flex: 1 },
  headerRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  hint: { fontSize: 12, lineHeight: 18 },
  list: { maxHeight: 360 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
  },
  rowText: { flex: 1, minWidth: 0 },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
