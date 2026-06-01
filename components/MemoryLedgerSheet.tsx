import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import type { CircadianTheme } from '../theme/circadianTheme';
import { DARK_MENU_SURFACE } from '../theme/circadianTheme';
import { DEFAULT_MEMORY_ITEMS, loadMemoryLedger, saveMemoryLedger } from '../utils/memoryLedger';

const MENU_SOLID = '#2A1848';

type MemoryItem = {
  id: string;
  label: string;
  summary: string;
  usage: string;
  enabled?: boolean;
};

export function MemoryLedgerSheet({
  visible,
  theme,
  onClose,
}: {
  visible: boolean;
  theme: CircadianTheme;
  onClose: () => void;
}) {
  const [items, setItems] = useState<MemoryItem[]>(DEFAULT_MEMORY_ITEMS);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    void loadMemoryLedger().then(setItems);
  }, [visible]);

  const toggleExpand = (id: string) => {
    setExpandedId((current) => (current === id ? null : id));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.anchor}>
          <Pressable
            style={[styles.sheet, { backgroundColor: MENU_SOLID, borderColor: DARK_MENU_SURFACE.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[styles.title, { color: DARK_MENU_SURFACE.text }]}>Memory Ledger</Text>
            <Text style={[styles.subtitle, { color: DARK_MENU_SURFACE.mutedText }]}>
              Context Emo keeps on this device to support you better.
            </Text>
            {items.map((item, index) => {
              const open = expandedId === item.id;
              return (
                <View
                  key={item.id}
                  style={[
                    styles.row,
                    index < items.length - 1 && styles.rowBorder,
                    { borderBottomColor: DARK_MENU_SURFACE.border },
                  ]}
                >
                  <View style={styles.rowMain}>
                    <Text style={[styles.rowLabel, { color: DARK_MENU_SURFACE.text }]}>{item.label}</Text>
                    <Text style={[styles.rowSummary, { color: DARK_MENU_SURFACE.mutedText }]}>{item.summary}</Text>
                    <Pressable
                      onPress={() => toggleExpand(item.id)}
                      style={styles.howRow}
                      accessibilityRole="button"
                      accessibilityLabel={`How Emo uses ${item.label}`}
                    >
                      <Text style={[styles.howLabel, { color: theme.accent }]}>How Emo uses this</Text>
                      {open ? (
                        <ChevronUp size={14} color={theme.accent} strokeWidth={2.4} />
                      ) : (
                        <ChevronDown size={14} color={theme.accent} strokeWidth={2.4} />
                      )}
                    </Pressable>
                    {open ? (
                      <Text style={[styles.usageBlock, { color: DARK_MENU_SURFACE.secondaryText }]}>{item.usage}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
            <Pressable
              onPress={() => {
                void saveMemoryLedger(items);
                onClose();
              }}
              style={[styles.doneBtn, { backgroundColor: theme.accent }]}
            >
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
  anchor: { width: '100%' },
  sheet: { borderRadius: 18, borderWidth: 0.5, padding: 20, maxHeight: '88%' },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 13, lineHeight: 19, marginBottom: 16 },
  row: { paddingVertical: 14 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  rowMain: { gap: 4 },
  rowLabel: { fontSize: 15, fontWeight: '600' },
  rowSummary: { fontSize: 13, lineHeight: 18 },
  howRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  howLabel: { fontSize: 12, fontWeight: '600' },
  usageBlock: { fontSize: 12, lineHeight: 18, marginTop: 8 },
  doneBtn: { marginTop: 16, borderRadius: 999, paddingVertical: 12, alignItems: 'center' },
  doneBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
});
