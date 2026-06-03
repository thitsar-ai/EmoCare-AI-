import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Sparkles, X } from 'lucide-react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { DARK_MENU_SURFACE } from '../../theme/circadianTheme';
import { HELPED_CATEGORIES } from '../../utils/thingsThatHelped';
import type { MainScreenKey } from '../navigation/AppNavigation';

const MENU_SOLID = '#2A1848';

export type HelpedRow = {
  id: string;
  recordId?: string;
  catalogId?: string | null;
  title: string;
  sub: string;
  color: string;
  categoryId: string;
  categoryLabel?: string;
  navigate: MainScreenKey | null;
  tip: string;
  emoPrompt?: string | null;
  custom?: boolean;
};

export function HelpedActivitySheet({
  visible,
  theme,
  item,
  onClose,
  onTryNow,
  onTalkEmo,
}: {
  visible: boolean;
  theme: CircadianTheme;
  item: HelpedRow | null;
  onClose: () => void;
  onTryNow: (item: HelpedRow) => void;
  onTalkEmo: (prompt: string) => void;
}) {
  if (!item) return null;

  const cat = HELPED_CATEGORIES[item.categoryId as keyof typeof HELPED_CATEGORIES];
  const accent = cat?.accent || item.color;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.anchor}>
          <Pressable
            style={[styles.sheet, { backgroundColor: MENU_SOLID, borderColor: DARK_MENU_SURFACE.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.header}>
              <View style={[styles.badge, { backgroundColor: `${accent}22`, borderColor: accent }]}>
                <Text style={[styles.badgeText, { color: accent }]}>
                  {(item.categoryLabel || cat?.label || 'Self-care').toUpperCase()}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <X size={18} color={DARK_MENU_SURFACE.mutedText} strokeWidth={2.2} />
              </Pressable>
            </View>

            <Text style={[styles.title, { color: DARK_MENU_SURFACE.text }]}>{item.title}</Text>
            <Text style={[styles.sub, { color: DARK_MENU_SURFACE.secondaryText }]}>{item.sub}</Text>
            <Text style={[styles.tip, { color: DARK_MENU_SURFACE.secondaryText }]}>{item.tip}</Text>

            <View style={styles.actions}>
              {item.navigate ? (
                <Pressable
                  onPress={() => onTryNow(item)}
                  style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
                >
                  <Text style={styles.primaryText}>Try this now</Text>
                </Pressable>
              ) : null}
              {item.emoPrompt ? (
                <Pressable
                  onPress={() => onTalkEmo(item.emoPrompt!)}
                  style={[styles.secondaryBtn, { borderColor: accent }]}
                >
                  <Sparkles size={14} color={accent} strokeWidth={2.2} />
                  <Text style={[styles.secondaryText, { color: accent }]}>Ask Emo</Text>
                </Pressable>
              ) : null}
              {!item.navigate && !item.emoPrompt ? (
                <Pressable
                  onPress={onClose}
                  style={[styles.primaryBtn, { backgroundColor: theme.accent }]}
                >
                  <Text style={styles.primaryText}>Got it</Text>
                </Pressable>
              ) : null}
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  anchor: { paddingHorizontal: 16, paddingBottom: 28 },
  sheet: { borderRadius: 22, borderWidth: 1, padding: 22, gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  badge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  title: { fontSize: 22, fontWeight: '700', marginTop: 4 },
  sub: { fontSize: 14, fontStyle: 'italic', marginBottom: 8 },
  tip: { fontSize: 15, lineHeight: 23, marginBottom: 16 },
  actions: { gap: 10, marginTop: 4 },
  primaryBtn: { borderRadius: 999, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 12,
  },
  secondaryText: { fontWeight: '700', fontSize: 14 },
});
