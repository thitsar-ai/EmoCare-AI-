import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { ChevronRight, Download } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ScreenSafeArea } from '../shared/ScreenSafeArea';
import { CrisisFooter } from '../shared/CrisisFooter';
import { CircadianGlassCard, CircadianHeroGlow } from '../shared/CircadianHeroGlow';
import { useCircadianTheme, getCircadianIconColor, type CircadianTheme } from '../../theme/circadianTheme';
import {
  DEFAULT_SETTINGS,
  formatTimezoneLabel,
  loadSettings,
  saveSettings,
} from '../../utils/settingsStorage';
import { deleteAllUserData, exportUserData } from '../../utils/dataExport';
import { ScreenNavChrome, type MainScreenKey, useAppNav } from '../navigation/AppNavigation';
import { isElevenLabsConfigured } from '../../utils/elevenLabs';
import { refreshEmocareConfig } from '../../utils/emocareApi';
import { hapticLight } from '../../utils/haptics';
import { isWebInstallSupported, useWebInstallPrompt } from '../../utils/webInstallPrompt';

const NAV_CONTENT_HEIGHT = 72;

type Settings = typeof DEFAULT_SETTINGS;

export function SettingsScreen({ onNav }: { onNav: (key: MainScreenKey) => void }) {
  const theme = useCircadianTheme();
  const insets = useSafeAreaInsets();
  const { userName } = useAppNav();
  const webInstall = useWebInstallPrompt();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const destructive = theme.isDark ? '#E87898' : '#D46BA8';
  const destructiveBg = theme.isDark ? 'rgba(120,30,60,0.45)' : 'rgba(212,107,168,0.15)';

  const refresh = useCallback(async () => {
    await refreshEmocareConfig();
    const s = await loadSettings();
    setSettings({
      ...s,
      timezone: formatTimezoneLabel(),
      elevenLabsEnabled: s.elevenLabsEnabled && isElevenLabsConfigured(),
    });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const patch = async (partial: Partial<Settings>) => {
    const next = await saveSettings(partial);
    setSettings(next);
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Delete all data?',
      'This removes check-ins, journal, memory, and settings from this device. You will return to onboarding.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete all data',
          style: 'destructive',
          onPress: () => void deleteAllUserData(),
        },
      ],
    );
  };

  const handleInstallApp = useCallback(async () => {
    void hapticLight();
    if (webInstall.isInstalled) return;

    if (webInstall.canPrompt) {
      const outcome = await webInstall.promptInstall();
      if (outcome === 'unavailable') {
        Alert.alert('Install EmoCare', webInstall.showManualInstallHelp());
      }
      return;
    }

    Alert.alert('Install EmoCare', webInstall.showManualInstallHelp());
  }, [webInstall]);

  return (
    <View style={styles.flex}>
      <CircadianHeroGlow theme={theme} />
      <ScreenSafeArea extraTop={4}>
        <View style={styles.chromeWrap}>
          <ScreenNavChrome theme={theme} title="Settings" titleFontSize={15} />
        </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: NAV_CONTENT_HEIGHT + insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection theme={theme} label="ACCOUNT">
          <SettingRow theme={theme} label="Name" value={userName.trim() || 'Not set'} />
          <View style={[styles.switchRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Daily reminders</Text>
            <Switch
              value={settings.notificationsEnabled !== false}
              onValueChange={(v) => void patch({ notificationsEnabled: v })}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
          <SettingRow theme={theme} label="Reminder time" value={settings.notificationTime} />
          <SettingRow theme={theme} label="Timezone" value={settings.timezone} last />
        </SettingsSection>

        <SettingsSection theme={theme} label="EMO'S VOICE">
          <SettingRow theme={theme} label="Voice style" value={settings.voiceStyle} />
          <SettingRow theme={theme} label="Speed" value={settings.voiceSpeed} />
          <SettingRow
            theme={theme}
            label="ElevenLabs voice"
            value={settings.elevenLabsEnabled ? 'Enabled' : 'Off'}
            last
          />
        </SettingsSection>

        <SettingsSection theme={theme} label="THEME">
          <View style={[styles.switchRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Circadian auto</Text>
            <Switch
              value={settings.circadianAuto}
              onValueChange={(v) => void patch({ circadianAuto: v })}
              trackColor={{ false: theme.border, true: theme.accent }}
              thumbColor="#FFFFFF"
            />
          </View>
          <SettingRow
            theme={theme}
            label="Dark/light"
            value={settings.themeMode === 'auto' ? 'Auto' : settings.themeMode}
            last
          />
        </SettingsSection>

        {isWebInstallSupported() ? (
          <SettingsSection theme={theme} label="APP">
            <Pressable
              onPress={() => void handleInstallApp()}
              disabled={webInstall.isInstalled}
              style={[styles.linkRow, { borderBottomColor: theme.border, opacity: webInstall.isInstalled ? 0.72 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel={
                webInstall.isInstalled
                  ? 'EmoCare is installed'
                  : webInstall.canPrompt
                    ? 'Install EmoCare app'
                    : 'How to install EmoCare'
              }
            >
              <View style={styles.installLabelRow}>
                {!webInstall.isInstalled ? (
                  <Download size={16} color={getCircadianIconColor(theme, 'accent')} strokeWidth={2.2} />
                ) : null}
                <Text style={[styles.rowLabel, { color: theme.text }]}>Install app</Text>
              </View>
              <View style={styles.linkAction}>
                <Text style={[styles.linkActionText, { color: theme.mutedText }]}>
                  {webInstall.isInstalled ? 'Installed' : webInstall.canPrompt ? 'Install' : 'How to'}
                </Text>
                {!webInstall.isInstalled ? (
                  <ChevronRight size={14} color={getCircadianIconColor(theme, 'muted')} />
                ) : null}
              </View>
            </Pressable>
            <Text style={[styles.installHint, { color: theme.mutedText }]}>
              {webInstall.isInstalled
                ? 'EmoCare is on your dock or home screen.'
                : 'Add EmoCare to your dock or home screen for a native-feeling sanctuary.'}
            </Text>
          </SettingsSection>
        ) : null}

        <SettingsSection theme={theme} label="PRIVACY">
          <Pressable onPress={() => onNav('memoryledger')} style={[styles.linkRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Memory Ledger</Text>
            <View style={styles.linkAction}>
              <Text style={[styles.linkActionText, { color: theme.mutedText }]}>View </Text>
              <ChevronRight size={14} color={getCircadianIconColor(theme, 'muted')} />
            </View>
          </Pressable>
          <Pressable style={[styles.linkRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Privacy Policy</Text>
            <View style={styles.linkAction}>
              <Text style={[styles.linkActionText, { color: theme.mutedText }]}>View </Text>
              <ChevronRight size={14} color={getCircadianIconColor(theme, 'muted')} />
            </View>
          </Pressable>
          <Pressable
            onPress={() => void exportUserData()}
            style={styles.linkRow}
          >
            <Text style={[styles.rowLabel, { color: theme.text }]}>Export my data</Text>
            <View style={styles.linkAction}>
              <Text style={[styles.linkActionText, { color: theme.mutedText }]}>Export </Text>
              <ChevronRight size={14} color={getCircadianIconColor(theme, 'muted')} />
            </View>
          </Pressable>
        </SettingsSection>

        <Pressable
          onPress={handleDeleteAll}
          style={[styles.deleteBtn, { backgroundColor: destructiveBg, borderColor: `${destructive}55` }]}
        >
          <Text style={[styles.deleteText, { color: destructive }]}>Delete all data</Text>
        </Pressable>

        <CrisisFooter theme={theme} variant="compact" style={styles.disclaimer} />
      </ScrollView>
      </ScreenSafeArea>
    </View>
  );
}

function SettingsSection({
  theme,
  label,
  children,
}: {
  theme: CircadianTheme;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={[styles.sectionLabel, { color: theme.mutedText }]}>{label}</Text>
      <CircadianGlassCard theme={theme} style={styles.sectionCard}>
        {children}
      </CircadianGlassCard>
    </View>
  );
}

function SettingRow({
  theme,
  label,
  value,
  last,
}: {
  theme: CircadianTheme;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.settingRow, !last && { borderBottomColor: theme.border, ...styles.settingRowBorder }]}>
      <Text style={[styles.rowLabel, { color: theme.text }]}>{label}</Text>
      <Text style={[styles.rowValue, { color: theme.mutedText }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chromeWrap: { paddingHorizontal: 8, paddingBottom: 4 },
  sectionWrap: { marginBottom: 14 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8, marginLeft: 4 },
  sectionCard: { marginBottom: 0, paddingVertical: 4 },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  settingRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLabel: { fontSize: 17, lineHeight: 22 },
  rowValue: { fontSize: 16 },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  linkAction: { flexDirection: 'row', alignItems: 'center' },
  linkActionText: { fontSize: 16 },
  installLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  installHint: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 10,
  },
  deleteBtn: {
    marginTop: 6,
    borderRadius: 999,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 0.5,
  },
  deleteText: { fontWeight: '700', fontSize: 16 },
  disclaimer: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 18,
    paddingHorizontal: 12,
  },
});
