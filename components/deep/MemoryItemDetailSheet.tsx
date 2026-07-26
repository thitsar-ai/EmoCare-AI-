import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Pencil, Shield, Trash2, X } from 'lucide-react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { DARK_MENU_SURFACE, MENU_SOLID, tokens } from '../../theme/tokens';
import { hapticLight } from '../../utils/haptics';

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
  personalMemory?: boolean;
  editable?: boolean;
  confirmedByUser?: boolean;
  emoMayUse?: boolean;
  categoryLabel?: string;
  sourceLine?: string;
  sourceText?: string;
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
  onSaveEdit,
  onToggleEmoMayUse,
}: {
  visible: boolean;
  theme: CircadianTheme;
  item: MemoryDetailItem | null;
  onClose: () => void;
  onForget?: (item: MemoryDetailItem) => void;
  onSaveEdit?: (item: MemoryDetailItem, text: string) => void | Promise<void>;
  onToggleEmoMayUse?: (item: MemoryDetailItem, emoMayUse: boolean) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (!visible || !item) return;
    setEditing(false);
    setDraft(item.text || item.detail || '');
  }, [visible, item]);

  if (!item) return null;

  const isPersonal = Boolean(item.personalMemory);
  const accent = item.color || (isPersonal ? tokens.brand.accent : KIND_ACCENTS[item.kind]);
  const title = isPersonal ? 'Saved memory' : item.label || item.text || 'Memory item';
  const body = isPersonal ? item.text || '' : item.detail || item.summary || '';
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
                <Text style={[styles.badgeText, { color: accent }]}>
                  {isPersonal ? 'CONFIRMED MEMORY' : KIND_LABELS[item.kind]}
                </Text>
              </View>
              <Pressable onPress={onClose} hitSlop={10}>
                <X size={18} color={DARK_MENU_SURFACE.mutedText} strokeWidth={2.2} />
              </Pressable>
            </View>

            <Text style={[styles.title, { color: DARK_MENU_SURFACE.text }]}>{title}</Text>

            {isPersonal && editing ? (
              <TextInput
                value={draft}
                onChangeText={setDraft}
                multiline
                maxLength={280}
                style={[
                  styles.editInput,
                  {
                    color: DARK_MENU_SURFACE.text,
                    borderColor: DARK_MENU_SURFACE.border,
                  },
                ]}
                accessibilityLabel="Edit memory fact"
              />
            ) : (
              <Text style={[styles.body, { color: DARK_MENU_SURFACE.secondaryText }]}>
                {body || item.detail || ''}
              </Text>
            )}

            {isPersonal ? (
              <View style={styles.metaBlock}>
                {item.sourceLine ? (
                  <Text style={[styles.metaLine, { color: DARK_MENU_SURFACE.secondaryText }]}>
                    Source: {item.sourceLine}
                  </Text>
                ) : null}
                {item.categoryLabel ? (
                  <Text style={[styles.metaLine, { color: DARK_MENU_SURFACE.secondaryText }]}>
                    Category: {item.categoryLabel}
                  </Text>
                ) : null}
                <Text style={[styles.metaLine, { color: DARK_MENU_SURFACE.secondaryText }]}>
                  Confirmed by user: {item.confirmedByUser === false ? 'No' : 'Yes'}
                </Text>
                {item.sourceText && item.sourceText !== item.text ? (
                  <Text style={[styles.metaLine, { color: DARK_MENU_SURFACE.mutedText }]}>
                    Supporting text: {item.sourceText}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {isPersonal && onToggleEmoMayUse ? (
              <View style={[styles.toggleRow, { borderColor: `${accent}44` }]}>
                <Text style={[styles.toggleLabel, { color: DARK_MENU_SURFACE.text }]}>
                  Emo may use this
                </Text>
                <Switch
                  value={item.emoMayUse !== false}
                  onValueChange={(value) => {
                    void hapticLight();
                    void onToggleEmoMayUse(item, value);
                  }}
                  trackColor={{ false: 'rgba(255,255,255,0.15)', true: `${accent}88` }}
                  thumbColor="#FFFFFF"
                  accessibilityLabel="Emo may use this memory"
                />
              </View>
            ) : null}

            {!isPersonal && usage ? (
              <View style={[styles.usageBox, { borderColor: `${accent}44` }]}>
                <Shield size={14} color={accent} strokeWidth={2.2} />
                <Text style={[styles.usageText, { color: DARK_MENU_SURFACE.secondaryText }]}>{usage}</Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              {isPersonal && onSaveEdit ? (
                editing ? (
                  <Pressable
                    onPress={() => {
                      void hapticLight();
                      void onSaveEdit(item, draft.trim());
                      setEditing(false);
                    }}
                    style={[styles.primaryBtn, { backgroundColor: tokens.brand.ctaStart }]}
                    disabled={draft.trim().length < 8}
                  >
                    <Text style={styles.primaryText}>Save correction</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => {
                      void hapticLight();
                      setEditing(true);
                    }}
                    style={[styles.editBtn, { borderColor: `${accent}66` }]}
                  >
                    <Pencil size={15} color={accent} strokeWidth={2.2} />
                    <Text style={[styles.editText, { color: accent }]}>Edit memory</Text>
                  </Pressable>
                )
              ) : null}

              {item.erasable && onForget ? (
                <Pressable
                  onPress={() => onForget(item)}
                  style={[styles.forgetBtn, { borderColor: `${destructive}66` }]}
                >
                  <Trash2 size={15} color={destructive} strokeWidth={2.2} />
                  <Text style={[styles.forgetText, { color: destructive }]}>Forget this</Text>
                </Pressable>
              ) : !isPersonal ? (
                <Pressable
                  onPress={onClose}
                  style={[styles.primaryBtn, { backgroundColor: tokens.brand.ctaStart }]}
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
  title: { fontSize: 20, fontWeight: '700', marginTop: 4, lineHeight: 26 },
  body: { fontSize: 15, lineHeight: 23, marginBottom: 4 },
  editInput: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
    marginBottom: 4,
  },
  metaBlock: { gap: 4, marginTop: 4, marginBottom: 4 },
  metaLine: { fontSize: 13, lineHeight: 19 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 4,
  },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
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
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderRadius: 999,
    paddingVertical: 13,
  },
  editText: { fontWeight: '700', fontSize: 14 },
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
