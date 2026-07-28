import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Bookmark, Check, Compass, Library, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { ORACLE_MODES, type OracleModeId } from '../../constants/brandCopy';
import { tokens } from '../../theme/tokens';
import { hapticLight } from '../../utils/haptics';

export type MiraControlsAvailability = {
  canResearchDeeper: boolean;
  canSeeSources: boolean;
  canSave: boolean;
  canClear: boolean;
  sourcesDisabledHint?: string;
};

type Props = {
  visible: boolean;
  theme: CircadianTheme;
  mode: OracleModeId;
  availability: MiraControlsAvailability;
  onClose: () => void;
  onSelectMode: (id: OracleModeId) => void;
  onResearchDeeper: () => void;
  onSeeSources: () => void;
  onSave: () => void;
  onClear: () => void;
};

/** Opaque sheet surface — frosted theme.card lets the composer show through. */
const SHEET_BG = '#FBF8FD';

export function MiraControlsSheet({
  visible,
  theme,
  mode,
  availability,
  onClose,
  onSelectMode,
  onResearchDeeper,
  onSeeSources,
  onSave,
  onClear,
}: Props) {
  const insets = useSafeAreaInsets();
  const accent = tokens.oracle.accent;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      accessibilityViewIsModal
      statusBarTranslucent
    >
      <View style={styles.root}>
        {/* flex:1 backdrop — does NOT cover the sheet (avoids stolen taps) */}
        <Pressable
          style={styles.backdrop}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Dismiss Mira controls"
        />
        <View
          style={[
            styles.sheet,
            {
              backgroundColor: SHEET_BG,
              borderColor: tokens.border.standard,
              paddingBottom: Math.max(insets.bottom, 16) + 8,
            },
          ]}
          accessibilityViewIsModal
        >
          <View style={[styles.handle, { backgroundColor: theme.secondaryText }]} />
          <Text style={[styles.sheetTitle, { color: theme.text }]}>Mira controls</Text>

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
          >
            <Text style={[styles.sectionLabel, { color: theme.secondaryText }]}>RESPONSE STYLE</Text>
            <View style={styles.sectionBlock}>
              {ORACLE_MODES.map((item) => {
                const selected = mode === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      void hapticLight();
                      onSelectMode(item.id);
                    }}
                    style={[
                      styles.modeRow,
                      {
                        borderColor: selected ? accent : tokens.border.standard,
                        backgroundColor: selected ? `${accent}18` : '#FFFFFF',
                      },
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected, checked: selected }}
                    accessibilityLabel={item.label}
                    accessibilityHint={item.hint}
                  >
                    <View style={styles.modeCopy}>
                      <Text
                        style={[
                          styles.modeLabel,
                          { color: selected ? accent : theme.text },
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text style={[styles.modeHint, { color: theme.secondaryText }]}>
                        {item.hint}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.checkWrap,
                        {
                          borderColor: selected ? accent : tokens.border.standard,
                          backgroundColor: selected ? accent : 'transparent',
                        },
                      ]}
                    >
                      {selected ? <Check size={12} color="#FFFFFF" strokeWidth={3} /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.sectionLabel, { color: theme.secondaryText, marginTop: 18 }]}>
              RESPONSE ACTIONS
            </Text>
            <View style={styles.sectionBlock}>
              <ActionRow
                theme={theme}
                icon={Compass}
                label="Research deeper"
                accessibilityLabel="Research this answer more deeply"
                enabled={availability.canResearchDeeper}
                disabledHint="Available after Mira replies"
                onPress={onResearchDeeper}
              />
              <ActionRow
                theme={theme}
                icon={Library}
                label="See sources"
                accessibilityLabel="View published sources"
                enabled={availability.canSeeSources}
                disabledHint={
                  availability.sourcesDisabledHint || 'Available after sourced research'
                }
                onPress={onSeeSources}
              />
              <ActionRow
                theme={theme}
                icon={Bookmark}
                label="Save response"
                accessibilityLabel="Save Mira response"
                enabled={availability.canSave}
                disabledHint="Available after Mira replies"
                onPress={onSave}
              />
              <ActionRow
                theme={theme}
                icon={Trash2}
                label="Clear conversation"
                accessibilityLabel="Clear Mira conversation"
                enabled={availability.canClear}
                disabledHint="No messages to clear"
                destructive
                onPress={onClear}
              />
            </View>
          </ScrollView>

          <Pressable
            onPress={onClose}
            style={styles.doneBtn}
            accessibilityRole="button"
            accessibilityLabel="Close Mira controls"
          >
            <Text style={[styles.doneText, { color: accent }]}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function ActionRow({
  theme,
  icon: Icon,
  label,
  accessibilityLabel,
  enabled,
  disabledHint,
  destructive,
  onPress,
}: {
  theme: CircadianTheme;
  icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  label: string;
  accessibilityLabel: string;
  enabled: boolean;
  disabledHint: string;
  destructive?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        if (!enabled) return;
        void hapticLight();
        onPress();
      }}
      disabled={!enabled}
      style={({ pressed }) => [
        styles.actionRow,
        !enabled && styles.actionDisabled,
        enabled && pressed && styles.actionPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !enabled }}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={enabled ? undefined : disabledHint}
    >
      <View
        style={[
          styles.actionIcon,
          {
            backgroundColor: destructive ? 'rgba(240,138,138,0.12)' : `${tokens.oracle.accent}14`,
          },
        ]}
      >
        <Icon
          size={16}
          color={destructive ? '#E07A7A' : tokens.oracle.accent}
          strokeWidth={2.2}
        />
      </View>
      <View style={styles.actionCopy}>
        <Text
          style={[
            styles.actionLabel,
            { color: destructive ? '#D96B6B' : theme.text },
            !enabled && { color: theme.secondaryText },
          ]}
        >
          {label}
        </Text>
        {!enabled ? (
          <Text style={[styles.actionHint, { color: theme.secondaryText }]}>{disabledHint}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(12, 8, 28, 0.55)',
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 18,
    paddingTop: 10,
    maxHeight: '78%',
    // Keep sheet above dimmed backdrop / composer ghost
    zIndex: 2,
    elevation: 24,
    shadowColor: '#1A1035',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.35,
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  sectionBlock: {
    gap: 8,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 56,
  },
  modeCopy: { flex: 1, minWidth: 0 },
  modeLabel: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  modeHint: { fontSize: 12, lineHeight: 17 },
  checkWrap: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  actionPressed: { opacity: 0.75 },
  actionDisabled: { opacity: 0.55 },
  actionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: { flex: 1, minWidth: 0 },
  actionLabel: { fontSize: 15, fontWeight: '600' },
  actionHint: { fontSize: 11, marginTop: 2, lineHeight: 15 },
  doneBtn: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
  },
  doneText: { fontSize: 16, fontWeight: '700' },
});
