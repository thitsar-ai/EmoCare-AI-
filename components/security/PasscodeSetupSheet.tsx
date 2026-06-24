import React, { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import type { CircadianTheme } from '../../theme/circadianTheme';
import { DARK_MENU_SURFACE, MENU_SOLID } from '../../theme/tokens';
import { clearPasscode, setPasscode, verifyPasscode } from '../../utils/passcodeLock';
import { PasscodeEntry } from './PasscodeEntry';


export type PasscodeSetupMode = 'create' | 'change' | 'disable';

type Step = 'entry' | 'confirm' | 'verify';

export function PasscodeSetupSheet({
  visible,
  theme,
  mode,
  onClose,
  onEnabled,
  onDisabled,
}: {
  visible: boolean;
  theme: CircadianTheme;
  mode: PasscodeSetupMode;
  onClose: () => void;
  onEnabled?: () => void;
  onDisabled?: () => void;
}) {
  const [step, setStep] = useState<Step>('entry');
  const [draftPin, setDraftPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setStep(mode === 'disable' || mode === 'change' ? 'verify' : 'entry');
    setDraftPin('');
    setError(null);
  }, [visible, mode]);

  const handleClose = () => {
    setDraftPin('');
    setError(null);
    onClose();
  };

  const handleVerify = async (pin: string) => {
    const ok = await verifyPasscode(pin);
    if (!ok) {
      setError('Incorrect passcode.');
      return;
    }
    if (mode === 'disable') {
      await clearPasscode();
      onDisabled?.();
      handleClose();
      return;
    }
    setStep('entry');
    setDraftPin('');
    setError(null);
  };

  const handleEntry = (pin: string) => {
    setDraftPin(pin);
    setStep('confirm');
    setError(null);
  };

  const handleConfirm = async (pin: string) => {
    if (pin !== draftPin) {
      setError('Passcodes do not match.');
      setStep('entry');
      setDraftPin('');
      return;
    }
    await setPasscode(pin);
    onEnabled?.();
    handleClose();
  };

  const title =
    step === 'verify'
      ? 'Enter current passcode'
      : step === 'confirm'
        ? 'Confirm passcode'
        : mode === 'change'
          ? 'Choose new passcode'
          : 'Create a passcode';

  const subtitle =
    step === 'verify'
      ? mode === 'disable'
        ? 'Enter your passcode to turn it off.'
        : 'Verify your current passcode first.'
      : step === 'confirm'
        ? 'Enter the same 4 digits again.'
        : 'Use 4 digits to lock EmoCare when you leave the app.';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.overlayDismiss} onPress={handleClose} accessibilityLabel="Close" />
        <View style={styles.anchor}>
          <View style={[styles.sheet, { backgroundColor: MENU_SOLID, borderColor: DARK_MENU_SURFACE.border }]}>
            <ScrollView
              bounces={false}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.sheetScroll}
            >
              <View style={styles.headerRow}>
                <View style={[styles.iconWrap, { backgroundColor: `${theme.accent}22` }]}>
                  <Lock size={18} color={theme.accent} strokeWidth={2.2} />
                </View>
                <View style={styles.flex}>
                  <Text style={[styles.sheetTitle, { color: DARK_MENU_SURFACE.text }]}>App passcode</Text>
                  <Text style={[styles.sheetHint, { color: DARK_MENU_SURFACE.mutedText }]}>
                    Stored securely on this device. EmoCare locks when you leave the app.
                  </Text>
                </View>
              </View>

              <PasscodeEntry
                theme={{
                  ...theme,
                  text: DARK_MENU_SURFACE.text,
                  mutedText: DARK_MENU_SURFACE.mutedText,
                  card: DARK_MENU_SURFACE.card,
                  border: DARK_MENU_SURFACE.border,
                }}
                title={title}
                subtitle={subtitle}
                error={error}
                onComplete={(pin) => {
                  if (step === 'verify') void handleVerify(pin);
                  else if (step === 'entry') handleEntry(pin);
                  else void handleConfirm(pin);
                }}
                onPinChange={() => setError(null)}
              />

              <Pressable onPress={handleClose} style={styles.cancelBtn}>
                <Text style={{ color: DARK_MENU_SURFACE.mutedText, fontWeight: '600' }}>Cancel</Text>
              </Pressable>
            </ScrollView>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(8, 4, 20, 0.72)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  overlayDismiss: {
    ...StyleSheet.absoluteFillObject,
  },
  anchor: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    zIndex: 1,
  },
  sheet: {
    borderRadius: 24,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  sheetScroll: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
  },
  headerRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  sheetHint: { fontSize: 13, lineHeight: 18 },
  cancelBtn: { alignItems: 'center', paddingTop: 8, paddingBottom: 4 },
});
