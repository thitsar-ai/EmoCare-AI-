import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { DARK_MENU_SURFACE, MENU_SOLID, tokens } from '../../theme/tokens';
import { loadSettings, saveSettings } from '../../utils/settingsStorage';

export const NOTIFICATION_TIME_OPTIONS = ['8:00 AM', '12:00 PM', '6:00 PM', '8:00 PM'];

export function NotificationSheet({
  visible,
  theme,
  onClose,
  onSaved,
}: {
  visible: boolean;
  theme: CircadianTheme;
  onClose: () => void;
  onSaved?: (enabled: boolean, time: string) => void;
}) {
  const [enabled, setEnabled] = useState(true);
  const [time, setTime] = useState('8:00 PM');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    void loadSettings().then((s) => {
      setEnabled(s.notificationsEnabled !== false);
      setTime(s.notificationTime || '8:00 PM');
    });
  }, [visible]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings({ notificationsEnabled: enabled, notificationTime: time });
      onSaved?.(enabled, time);
      onClose();
    } finally {
      setSaving(false);
    }
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
                <Bell size={18} color={theme.accent} strokeWidth={2.2} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.title, { color: DARK_MENU_SURFACE.text }]}>Daily reminders</Text>
                <Text style={[styles.hint, { color: DARK_MENU_SURFACE.mutedText }]}>
                  A gentle nudge to check in — stored on this device only.
                </Text>
              </View>
            </View>

            <View style={[styles.toggleRow, { borderColor: DARK_MENU_SURFACE.border }]}>
              <Text style={[styles.toggleLabel, { color: DARK_MENU_SURFACE.text }]}>Reminders on</Text>
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{ false: DARK_MENU_SURFACE.border, true: theme.accent }}
                thumbColor="#FFFFFF"
              />
            </View>

            {enabled ? (
              <>
                <Text style={[styles.timeLabel, { color: DARK_MENU_SURFACE.mutedText }]}>Reminder time</Text>
                <View style={styles.timeRow}>
                  {NOTIFICATION_TIME_OPTIONS.map((option) => {
                    const selected = time === option;
                    return (
                      <Pressable
                        key={option}
                        onPress={() => setTime(option)}
                        style={[
                          styles.timeChip,
                          {
                            borderColor: selected ? theme.accent : DARK_MENU_SURFACE.border,
                            backgroundColor: selected ? `${theme.accent}22` : DARK_MENU_SURFACE.card,
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: selected ? theme.accent : DARK_MENU_SURFACE.secondaryText,
                            fontWeight: selected ? '700' : '500',
                            fontSize: 13,
                          }}
                        >
                          {option}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : null}

            <View style={styles.actions}>
              <Pressable onPress={onClose} style={styles.ghostBtn}>
                <Text style={{ color: DARK_MENU_SURFACE.mutedText, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleSave()}
                disabled={saving}
                style={[
                  styles.saveBtn,
                  { backgroundColor: tokens.brand.ctaStart, opacity: saving ? 0.7 : 1 },
                ]}
              >
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 },
  anchor: { width: '100%' },
  sheet: { borderRadius: 18, borderWidth: 1, padding: 20, gap: 4 },
  flex: { flex: 1 },
  headerRow: { flexDirection: 'row', gap: 12, marginBottom: 14 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  hint: { fontSize: 12, lineHeight: 18 },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 12,
  },
  toggleLabel: { fontSize: 15, fontWeight: '600' },
  timeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  timeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  timeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
  ghostBtn: { paddingVertical: 10, paddingHorizontal: 14 },
  saveBtn: {
    minHeight: 56,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },
});
