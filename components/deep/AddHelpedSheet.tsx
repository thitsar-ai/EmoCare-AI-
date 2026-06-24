import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Plus, X } from 'lucide-react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { DARK_MENU_SURFACE, MENU_SOLID, tokens } from '../../theme/tokens';
import {
  HELPED_CATEGORIES,
  HELPED_CATEGORY_ORDER,
  getCatalogByCategory,
} from '../../utils/thingsThatHelped';

export function AddHelpedSheet({
  visible,
  theme,
  onClose,
  onAddCatalog,
  onAddCustom,
}: {
  visible: boolean;
  theme: CircadianTheme;
  onClose: () => void;
  onAddCatalog: (catalogId: string, categoryId: string) => void;
  onAddCustom: (title: string, categoryId: string) => void;
}) {
  const [categoryId, setCategoryId] = useState(HELPED_CATEGORY_ORDER[0]);
  const [customTitle, setCustomTitle] = useState('');

  const catalog = getCatalogByCategory(categoryId);
  const cat = HELPED_CATEGORIES[categoryId as keyof typeof HELPED_CATEGORIES];

  const submitCustom = () => {
    const trimmed = customTitle.trim();
    if (!trimmed) return;
    onAddCustom(trimmed, categoryId);
    setCustomTitle('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.anchor}>
          <Pressable
            style={[styles.sheet, { backgroundColor: MENU_SOLID, borderColor: DARK_MENU_SURFACE.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.header}>
              <Text style={[styles.title, { color: DARK_MENU_SURFACE.text }]}>Log what helped</Text>
              <Pressable onPress={onClose} hitSlop={10}>
                <X size={18} color={DARK_MENU_SURFACE.mutedText} strokeWidth={2.2} />
              </Pressable>
            </View>
            <Text style={[styles.hint, { color: DARK_MENU_SURFACE.mutedText }]}>
              Choose a category, then pick an activity or add your own.
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {HELPED_CATEGORY_ORDER.map((id) => {
                const c = HELPED_CATEGORIES[id as keyof typeof HELPED_CATEGORIES];
                const selected = categoryId === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setCategoryId(id)}
                    style={[
                      styles.chip,
                      {
                        borderColor: c.accent,
                        backgroundColor: selected ? c.chipBg : 'transparent',
                      },
                    ]}
                  >
                    <Text style={{ color: c.accent, fontWeight: selected ? '700' : '600', fontSize: 12 }}>
                      {c.shortLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={[styles.sectionLabel, { color: DARK_MENU_SURFACE.mutedText }]}>
              {cat?.label?.toUpperCase()}
            </Text>
            <Text style={[styles.catDesc, { color: DARK_MENU_SURFACE.secondaryText }]}>{cat?.description}</Text>

            <ScrollView style={styles.catalogScroll} nestedScrollEnabled>
              {catalog.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    onAddCatalog(item.id, item.categoryId);
                    onClose();
                  }}
                  style={[styles.catalogRow, { borderBottomColor: DARK_MENU_SURFACE.border }]}
                >
                  <View style={[styles.dot, { backgroundColor: cat.accent }]} />
                  <View style={styles.flex}>
                    <Text style={[styles.rowTitle, { color: DARK_MENU_SURFACE.text }]}>{item.title}</Text>
                    <Text style={[styles.rowSub, { color: DARK_MENU_SURFACE.mutedText }]}>{item.sub}</Text>
                  </View>
                  <Plus size={16} color={cat.accent} strokeWidth={2.4} />
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.sectionLabel, { color: DARK_MENU_SURFACE.mutedText, marginTop: 12 }]}>
              OR ADD YOUR OWN
            </Text>
            <TextInput
              style={[
                styles.input,
                { color: DARK_MENU_SURFACE.text, borderColor: DARK_MENU_SURFACE.border },
              ]}
              placeholder="e.g. Swimming, movie night, coffee with a friend"
              placeholderTextColor={DARK_MENU_SURFACE.mutedText}
              value={customTitle}
              onChangeText={setCustomTitle}
              returnKeyType="done"
              onSubmitEditing={submitCustom}
            />
            <Pressable
              onPress={submitCustom}
              disabled={!customTitle.trim()}
              style={[
                styles.addBtn,
                { backgroundColor: tokens.brand.ctaStart, opacity: customTitle.trim() ? 1 : 0.5 },
              ]}
            >
              <Text style={styles.addBtnText}>Add to this week</Text>
            </Pressable>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  anchor: { maxHeight: '88%' },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    padding: 20,
    maxHeight: '100%',
  },
  flex: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  title: { fontSize: 18, fontWeight: '700' },
  hint: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  chipScroll: { marginBottom: 14, flexGrow: 0 },
  chip: {
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  sectionLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1.2, marginBottom: 6 },
  catDesc: { fontSize: 13, lineHeight: 18, marginBottom: 10 },
  catalogScroll: { maxHeight: 220 },
  catalogRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dot: { width: 8, height: 8, borderRadius: 2, transform: [{ rotate: '45deg' }] },
  rowTitle: { fontSize: 15, fontWeight: '600' },
  rowSub: { fontSize: 12, marginTop: 2 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 12,
  },
  addBtn: {
    borderRadius: 28,
    minHeight: 56,
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  addBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
});
