import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Shield, Trash2, X } from 'lucide-react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { DARK_MENU_SURFACE, MENU_SOLID, tokens } from '../../theme/tokens';

export type MemoryDetailItem = {
  id: string;
  text?: string;
  label?: string;
  summary?: string;
  detail?: string;
  usage?: string;
  color?: string;
  kind: 'context' | 'milestone' | 'type';
  erasable?: boolean;
};

const KIND_LABELS = {
  context: 'PERSONAL CONTEXT',
  milestone: 'MILESTONE',
  type: 'MEMORY TYPE',
};

const KIND_ACCENTS = {
  context: '#9B7BFF',
  milestone: '#3DBDA8',
  type: '#E89B5C',
};

export function MemoryItemDetailSheet({
  visible,
  theme,
  item,
  onClose,
  onForget,
}: {
  visible: boolean;
  theme: CircadianTheme;
  item: MemoryDetailItem | null;
  onClose: () => void;
  onForget?: (item: MemoryDetailItem) => void;
}) {
  if (!item) return null;

  const accent = item.color || KIND_ACCENTS[item.kind];
  const title = item.label || item.text || 'Memory item';
  const body = item.detail || item.summary || '';
  const usage = item.usage || '';
  const destructive = theme.isDark ? '#E87898' : '#D46BA8';

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
                <Text style={[styles.badgeText, { color: accent }]}>{KIND_LABELS[item.kind]}</Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <X size={18} color={DARK_MENU_SURFACE.mutedText} strokeWidth={2.2} />
              </Pressable>
            </View>

            <Text style={[styles.title, { color: DARK_MENU_SURFACE.text }]}>{title}</Text>
            {body ? (
              <Text style={[styles.body, { color: DARK_MENU_SURFACE.secondaryText }]}>{body}</Text>
            ) : null}
            {usage ? (
              <View style={[styles.usageBox, { borderColor: `${accent}44` }]}>
                <Shield size={14} color={accent} strokeWidth={2.2} />
                <Text style={[styles.usageText, { color: DARK_MENU_SURFACE.secondaryText }]}>{usage}</Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              {item.erasable && onForget ? (
                <Pressable
                  onPress={() => onForget(item)}
                  style={[styles.forgetBtn, { borderColor: `${destructive}66` }]}
                >
                  <Trash2 size={15} color={destructive} strokeWidth={2.2} />
                  <Text style={[styles.forgetText, { color: destructive }]}>
                    Forget this
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={onClose}
                  style={[styles.primaryBtn, { backgroundColor: tokens.brand.ctaStart }]}
                >
                  <Text style={styles.primaryText}>Got it</Text>
                </Pressable>
              )}
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
  title: { fontSize: 20, fontWeight: '700', marginTop: 4, lineHeight: 26 },
  body: { fontSize: 15, lineHeight: 23, marginBottom: 4 },
  usageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 4,
    marginBottom: 8,
  },
  usageText: { flex: 1, fontSize: 13, lineHeight: 19 },
  actions: { gap: 10, marginTop: 4 },
  primaryBtn: {
    borderRadius: 28,
    minHeight: 56,
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
  forgetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 13,
  },
  forgetText: { fontWeight: '700', fontSize: 14 },
});
