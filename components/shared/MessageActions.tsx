import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Bookmark, Check, Copy, Trash2 } from 'lucide-react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { hapticLight } from '../../utils/haptics';
import { useUiCopy } from '../i18n/UiCopyProvider';

export type MessageActionsProps = {
  theme: CircadianTheme;
  messageId: string;
  text: string;
  /** Already saved to Memory Ledger for this message id. */
  saved?: boolean;
  onSave?: (messageId: string, text: string) => void | Promise<void>;
  onDelete?: (messageId: string) => void | Promise<void>;
  /** Compact inline row under an assistant bubble. */
  compact?: boolean;
};

/** Plain readable text for clipboard (strip UI noise, keep markdown structure). */
export function plainMessageText(raw: string): string {
  return String(raw || '')
    .replace(/\u200b/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Shared assistant-message actions for Emo Talk and Mira.
 * Copy / Save to Memory Ledger / Delete — one message at a time.
 */
export function MessageActions({
  theme,
  messageId,
  text,
  saved = false,
  onSave,
  onDelete,
  compact = true,
}: MessageActionsProps) {
  const { t } = useUiCopy();
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(saved);

  const handleCopy = async () => {
    void hapticLight();
    const plain = plainMessageText(text);
    if (!plain) return;
    try {
      await Clipboard.setStringAsync(plain);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      Alert.alert(t('talk.copyFailed'));
    }
  };

  const handleSave = async () => {
    if (!onSave || isSaved || saving) return;
    void hapticLight();
    setSaving(true);
    try {
      await onSave(messageId, plainMessageText(text));
      setIsSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!onDelete) return;
    void hapticLight();
    Alert.alert(t('msg.deleteConfirm'), undefined, [
      { text: t('msg.deleteCancel'), style: 'cancel' },
      {
        text: t('msg.deleteConfirmAction'),
        style: 'destructive',
        onPress: () => {
          void onDelete(messageId);
        },
      },
    ]);
  };

  return (
    <View style={[styles.row, compact && styles.rowCompact]} accessibilityRole="toolbar">
      <ActionChip
        theme={theme}
        label={copied ? t('msg.copied') : t('msg.copy')}
        Icon={copied ? Check : Copy}
        onPress={() => void handleCopy()}
        accent={copied}
      />
      {onSave ? (
        <ActionChip
          theme={theme}
          label={isSaved ? t('msg.saved') : t('msg.saveToMemory')}
          Icon={isSaved ? Check : Bookmark}
          onPress={() => void handleSave()}
          accent={isSaved}
          disabled={isSaved || saving}
        />
      ) : null}
      {onDelete ? (
        <ActionChip
          theme={theme}
          label={t('msg.delete')}
          Icon={Trash2}
          onPress={handleDelete}
          destructive
        />
      ) : null}
    </View>
  );
}

function ActionChip({
  theme,
  label,
  Icon,
  onPress,
  accent,
  destructive,
  disabled,
}: {
  theme: CircadianTheme;
  label: string;
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  onPress: () => void;
  accent?: boolean;
  destructive?: boolean;
  disabled?: boolean;
}) {
  const color = destructive
    ? '#D46BA8'
    : accent
      ? theme.accent
      : theme.secondaryText;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        {
          borderColor: `${color}44`,
          backgroundColor: accent ? `${theme.accent}14` : 'transparent',
          opacity: disabled ? 0.55 : pressed ? 0.85 : 1,
        },
      ]}
    >
      <Icon size={13} color={color} strokeWidth={2.2} />
      <Text style={[styles.chipLabel, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  rowCompact: {
    marginTop: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: '100%',
  },
  chipLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0,
    flexShrink: 1,
  },
});
