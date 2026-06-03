import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Download, X } from 'lucide-react-native';
import { useCircadianTheme } from '../../theme/circadianTheme';
import { hapticLight } from '../../utils/haptics';
import { isWebInstallSupported, useWebInstallPrompt } from '../../utils/webInstallPrompt';

/** Web-only: invite user to install EmoCare as a desktop/home-screen app. */
export function WebInstallBanner() {
  const theme = useCircadianTheme();
  const { canPrompt, isInstalled, bannerDismissed, promptInstall, dismissBanner } = useWebInstallPrompt();

  if (!isWebInstallSupported() || isInstalled || bannerDismissed || !canPrompt) {
    return null;
  }

  const handleInstall = async () => {
    void hapticLight();
    await promptInstall();
  };

  const handleDismiss = () => {
    void hapticLight();
    dismissBanner();
  };

  return (
    <View
      style={[
        styles.banner,
        {
          backgroundColor: theme.isDark ? 'rgba(42, 24, 72, 0.96)' : 'rgba(255,255,255,0.96)',
          borderColor: `${theme.accent}44`,
        },
      ]}
    >
      <View style={styles.copy}>
        <Text style={[styles.title, { color: theme.text }]}>Install EmoCare</Text>
        <Text style={[styles.sub, { color: theme.secondaryText }]}>
          Add your sanctuary to the dock — opens like a native app.
        </Text>
      </View>
      <Pressable
        onPress={() => void handleInstall()}
        style={[styles.installBtn, { backgroundColor: theme.accent }]}
      >
        <Download size={14} color="#FFFFFF" strokeWidth={2.4} />
        <Text style={styles.installText}>Install</Text>
      </Pressable>
      <Pressable onPress={handleDismiss} hitSlop={10} accessibilityLabel="Dismiss install banner">
        <X size={16} color={theme.mutedText} strokeWidth={2.2} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 88,
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
  },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 13, fontWeight: '700' },
  sub: { fontSize: 11, lineHeight: 15, marginTop: 2 },
  installBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  installText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
});
