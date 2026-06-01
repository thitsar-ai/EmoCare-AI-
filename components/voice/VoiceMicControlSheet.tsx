import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { Pause, Play, Square, Volume2, VolumeX, type LucideIcon } from 'lucide-react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { getVoiceVolume, setVoiceVolume } from '../../utils/voiceVolume';

const MENU_SOLID = '#2A1848';

export function VoiceMicControlSheet({
  visible,
  theme,
  onClose,
  onPause,
  onPlay,
  onMute,
  onStop,
  showVolume = true,
}: {
  visible: boolean;
  theme: CircadianTheme;
  onClose: () => void;
  onPause: () => void;
  onPlay: () => void;
  onMute: () => void;
  onStop: () => void;
  showVolume?: boolean;
}) {
  const [volume, setVolume] = useState(1);

  useEffect(() => {
    if (!visible) return;
    void getVoiceVolume().then(setVolume);
  }, [visible]);

  const items: { label: string; Icon: LucideIcon; action: () => void }[] = [
    { label: 'Pause', Icon: Pause, action: onPause },
    { label: 'Play', Icon: Play, action: onPlay },
    { label: 'Mute', Icon: VolumeX, action: onMute },
    { label: 'Stop', Icon: Square, action: onStop },
  ];

  const bumpVolume = async (delta: number) => {
    const next = await setVoiceVolume(volume + delta);
    setVolume(next);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.anchor}>
          <View style={[styles.sheet, { backgroundColor: MENU_SOLID, borderColor: theme.border }]}>
            {items.map((item, index) => (
              <Pressable
                key={item.label}
                onPress={() => {
                  onClose();
                  item.action();
                }}
                style={({ pressed }) => [
                  styles.item,
                  index < items.length - 1 && styles.itemBorder,
                  pressed && styles.itemPressed,
                ]}
              >
                <item.Icon size={17} color={theme.secondaryText} strokeWidth={2.2} />
                <Text style={[styles.itemText, { color: theme.text }]}>{item.label}</Text>
              </Pressable>
            ))}
            {showVolume ? (
              <View style={[styles.volumeBlock, { borderTopColor: 'rgba(255,255,255,0.12)' }]}>
                <Text style={[styles.volumeLabel, { color: theme.mutedText }]}>Emo voice volume</Text>
                <View style={styles.volumeRow}>
                  <Pressable onPress={() => void bumpVolume(-0.1)} style={styles.volumeBtn}>
                    <VolumeX size={16} color={theme.secondaryText} strokeWidth={2.2} />
                  </Pressable>
                  <Text style={[styles.volumePct, { color: theme.text }]}>{Math.round(volume * 100)}%</Text>
                  <Pressable onPress={() => void bumpVolume(0.1)} style={styles.volumeBtn}>
                    <Volume2 size={16} color={theme.secondaryText} strokeWidth={2.2} />
                  </Pressable>
                </View>
                <Text style={[styles.volumeHint, { color: theme.mutedText }]}>
                  {Platform.OS === 'ios' && !Constants.isDevice
                    ? 'Simulator uses Mac speakers — click the simulator window, then raise Mac volume.'
                    : 'Also use your device volume keys.'}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  anchor: {
    alignItems: 'flex-end',
    paddingRight: 24,
    paddingBottom: 120,
  },
  sheet: {
    minWidth: 240,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  itemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  itemPressed: { backgroundColor: 'rgba(255,255,255,0.06)' },
  itemText: { fontSize: 15, fontWeight: '500', flex: 1 },
  volumeBlock: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 12,
    gap: 8,
  },
  volumeLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  volumeBtn: { padding: 8 },
  volumePct: { fontSize: 16, fontWeight: '700', minWidth: 48, textAlign: 'center' },
  volumeHint: { fontSize: 10, lineHeight: 14, textAlign: 'center' },
});
