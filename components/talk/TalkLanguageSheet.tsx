import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Globe } from 'lucide-react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { DARK_MENU_SURFACE, MENU_SOLID, tokens } from '../../theme/tokens';
import { hapticLight } from '../../utils/haptics';
import {
  getChatLanguageAccessibilityLabel,
  getChatLanguageOptionsForUi,
} from '../../utils/chatLanguage';
import { localeAwareTextStyle, textNeedsMyanmarMetrics } from '../../utils/localeText';

type ChatLanguageId = 'auto' | 'en' | 'my' | 'es' | 'id' | 'pt-BR' | 'fr';

type Props = {
  visible: boolean;
  theme: CircadianTheme;
  value: ChatLanguageId;
  onClose: () => void;
  onSelect: (id: ChatLanguageId) => void;
};

const HINTS_EN: Record<ChatLanguageId, string> = {
  auto: 'Match the language you write in',
  en: 'Emo replies only in English',
  my: 'Emo replies only in natural Burmese',
  es: 'Emo replies only in Spanish',
  id: 'Emo replies only in Bahasa Indonesia',
  'pt-BR': 'Emo replies only in Brazilian Portuguese',
  fr: 'Emo replies only in French',
};

const HINTS_ID: Record<ChatLanguageId, string> = {
  auto: 'Mengikuti bahasa yang kamu tulis',
  en: 'Emo menjawab hanya dalam bahasa Inggris',
  my: 'Emo menjawab hanya dalam bahasa Burma yang alami',
  es: 'Emo menjawab hanya dalam bahasa Spanyol',
  id: 'Emo menjawab hanya dalam Bahasa Indonesia',
  'pt-BR': 'Emo menjawab hanya dalam Portugis Brasil',
  fr: 'Emo menjawab hanya dalam bahasa Prancis',
};

const HINTS_PT: Record<ChatLanguageId, string> = {
  auto: 'Acompanha o idioma da sua mensagem',
  en: 'A Emo responde somente em inglês',
  my: 'A Emo responde somente em birmanês natural',
  es: 'A Emo responde somente em espanhol',
  id: 'A Emo responde somente em indonésio',
  'pt-BR': 'A Emo responde somente em português brasileiro',
  fr: 'A Emo responde somente em francês',
};

const HINTS_FR: Record<ChatLanguageId, string> = {
  auto: 'Suit la langue de votre message',
  en: 'Emo répond uniquement en anglais',
  my: 'Emo répond uniquement en birman naturel',
  es: 'Emo répond uniquement en espagnol',
  id: 'Emo répond uniquement en indonésien',
  'pt-BR': 'Emo répond uniquement en portugais brésilien',
  fr: 'Emo répond uniquement en français',
};

function sheetChrome(value: ChatLanguageId) {
  if (value === 'id') {
    return {
      hints: HINTS_ID,
      title: 'Bahasa Emo',
      hint: 'Pilih bagaimana Emo berbicara denganmu. Disimpan untuk Talk (terpisah dari Mira).',
      done: 'Selesai',
    };
  }
  if (value === 'pt-BR') {
    return {
      hints: HINTS_PT,
      title: 'Idioma da Emo',
      hint: 'Escolha como a Emo fala com você. Salvo para Conversar (separado da Mira).',
      done: 'Concluído',
    };
  }
  if (value === 'fr') {
    return {
      hints: HINTS_FR,
      title: 'Langue d’Emo',
      hint: 'Choisissez comment Emo vous parle. Enregistré pour Parler (séparé de Mira).',
      done: 'Terminé',
    };
  }
  return {
    hints: HINTS_EN,
    title: 'Emo language',
    hint: 'Choose how Emo talks with you. Saved for Talk (separate from Mira).',
    done: 'Done',
  };
}

export function TalkLanguageSheet({ visible, theme, value, onClose, onSelect }: Props) {
  const options = getChatLanguageOptionsForUi(value);
  const chrome = sheetChrome(value);

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
                <Text style={[styles.title, { color: DARK_MENU_SURFACE.text }]}>{chrome.title}</Text>
                <Text style={[styles.hint, { color: DARK_MENU_SURFACE.mutedText }]}>{chrome.hint}</Text>
              </View>
            </View>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {options.map((option, index) => {
                const selected = value === option.id;
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => {
                      void hapticLight();
                      onSelect(option.id as ChatLanguageId);
                      onClose();
                    }}
                    style={[
                      styles.row,
                      index < options.length - 1 && {
                        borderBottomWidth: StyleSheet.hairlineWidth,
                        borderBottomColor: DARK_MENU_SURFACE.border,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={getChatLanguageAccessibilityLabel(value, option.id)}
                  >
                    <View style={styles.rowText}>
                      <Text
                        style={[
                          {
                            color: selected ? theme.accent : DARK_MENU_SURFACE.text,
                            fontWeight: selected ? '700' : '600',
                            fontSize: 16,
                            overflow: 'visible',
                          },
                          localeAwareTextStyle(option.label, {
                            fontSize: 16,
                            englishLineHeight: 22,
                          }),
                          textNeedsMyanmarMetrics(option.label) && { paddingTop: 4 },
                        ]}
                      >
                        {option.label}
                      </Text>
                      <Text style={{ color: DARK_MENU_SURFACE.mutedText, fontSize: 12, marginTop: 3 }}>
                        {chrome.hints[option.id as ChatLanguageId]}
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
            </ScrollView>

            <Pressable onPress={onClose} style={styles.doneBtn}>
              <Text style={{ color: tokens.brand.ctaStart, fontWeight: '700', fontSize: 15 }}>
                {chrome.done}
              </Text>
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
  anchor: { width: '100%', maxHeight: '86%' },
  sheet: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 18,
    maxHeight: '100%',
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
  list: { marginTop: 6, maxHeight: 420 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    minHeight: 52,
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
