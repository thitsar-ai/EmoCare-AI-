import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Lock, ScanFace } from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import { CircadianHeroGlow } from '../shared/CircadianHeroGlow';
import { ScreenSafeArea } from '../shared/ScreenSafeArea';
import { useCircadianTheme } from '../../theme/circadianTheme';
import { verifyPasscode } from '../../utils/passcodeLock';
import { getBiometricSupport, promptBiometricUnlock, describeBiometricError } from '../../utils/biometricUnlock';
import { loadSettings } from '../../utils/settingsStorage';
import { hapticLight } from '../../utils/haptics';
import { useLayoutInsets } from '../../utils/safeAreaInsets';
import { PasscodeEntry } from './PasscodeEntry';

export function PasscodeLockScreen({ onUnlock }: { onUnlock: () => void }) {
  const theme = useCircadianTheme();
  const { bottom: bottomInset } = useLayoutInsets();
  const [error, setError] = useState<string | null>(null);
  const [biometricLabel, setBiometricLabel] = useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const onUnlockRef = useRef(onUnlock);
  const authInFlight = useRef(false);
  onUnlockRef.current = onUnlock;

  const runBiometricUnlock = useCallback(async () => {
    if (authInFlight.current || !biometricLabel) return;
    authInFlight.current = true;
    setBiometricBusy(true);
    setError(null);
    void hapticLight();

    try {
      let result = await promptBiometricUnlock(biometricLabel, 'unlock');
      if (!result.success && result.reason === 'invalid_context') {
        await new Promise((r) => setTimeout(r, 400));
        result = await promptBiometricUnlock(biometricLabel, 'unlock');
      }
      if (result.success) {
        onUnlockRef.current();
        return;
      }
      const message = describeBiometricError(result.reason, biometricLabel);
      if (message) setError(message);
    } finally {
      authInFlight.current = false;
      setBiometricBusy(false);
    }
  }, [biometricLabel]);

  useEffect(() => {
    let active = true;
    void (async () => {
      const [support, settings] = await Promise.all([getBiometricSupport(), loadSettings()]);
      if (!active) return;
      setBiometricLabel(support.label);
      setBiometricEnabled(settings.biometricUnlockEnabled === true && support.available);
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleComplete = async (pin: string) => {
    const ok = await verifyPasscode(pin);
    if (ok) {
      setError(null);
      onUnlock();
      return;
    }
    setError('Incorrect passcode. Try again.');
  };

  return (
    <View style={styles.flex}>
      <CircadianHeroGlow theme={theme} />
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <ScreenSafeArea extraTop={8} edges={['top', 'left', 'right', 'bottom']}>
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(bottomInset, 16) + 12 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroBlock}>
            <View style={[styles.iconWrap, { backgroundColor: `${theme.accent}18`, borderColor: theme.border }]}>
              <Lock size={28} color={theme.accent} strokeWidth={2.2} />
            </View>
            <Text style={[styles.brand, { color: theme.accent }]}>SANCTUARY</Text>
            <PasscodeEntry
              theme={theme}
              title="Enter passcode"
              subtitle="Your conversations and journal stay private on this device."
              error={error}
              onComplete={(pin) => void handleComplete(pin)}
              onPinChange={() => setError(null)}
            />
          </View>

          {biometricEnabled && biometricLabel ? (
            <Pressable
              onPress={() => void runBiometricUnlock()}
              disabled={biometricBusy}
              hitSlop={{ top: 10, bottom: 14, left: 12, right: 12 }}
              style={({ pressed }) => [
                styles.biometricBtn,
                {
                  backgroundColor: pressed || biometricBusy ? `${theme.accent}30` : `${theme.accent}18`,
                  borderColor: pressed || biometricBusy ? theme.accent : `${theme.accent}66`,
                  opacity: biometricBusy ? 0.88 : 1,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Unlock with ${biometricLabel}`}
              accessibilityState={{ disabled: biometricBusy, busy: biometricBusy }}
            >
              {biometricBusy ? (
                <ActivityIndicator size="small" color={theme.accent} />
              ) : (
                <ScanFace size={20} color={theme.accent} strokeWidth={2.4} />
              )}
              <Text style={[styles.biometricText, { color: theme.text }]}>
                {biometricBusy ? `Opening ${biometricLabel}…` : `Unlock with ${biometricLabel}`}
              </Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </ScreenSafeArea>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    minHeight: '100%',
  },
  heroBlock: {
    alignItems: 'center',
    width: '100%',
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 0.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  brand: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 28,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
    paddingVertical: 16,
    paddingHorizontal: 22,
    borderRadius: 999,
    borderWidth: 1.5,
    minHeight: 54,
    alignSelf: 'center',
    zIndex: 10,
  },
  biometricText: {
    fontSize: 17,
    fontWeight: '700',
  },
});
