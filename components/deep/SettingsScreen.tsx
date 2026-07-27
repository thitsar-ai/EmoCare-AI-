import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { ChevronRight, Download, Phone, MessageCircle } from 'lucide-react-native';
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
import {
  getChatLanguageAccessibilityLabel,
  getChatLanguageOptionsForUi,
  getEmoLanguageSettingsHint,
} from '../../utils/chatLanguage';
import { localeTextMetrics, textNeedsMyanmarMetrics } from '../../utils/localeText';
import { exportUserData, deleteAllUserData } from '../../utils/dataExport';
import { triggerAppReset } from '../../utils/appReset';
import { isPasscodeEnabled } from '../../utils/passcodeLock';
import {
  describeBiometricError,
  getBiometricSupport,
  promptBiometricUnlock,
} from '../../utils/biometricUnlock';
import { PasscodeSetupSheet, type PasscodeSetupMode } from '../security/PasscodeSetupSheet';
import Constants from 'expo-constants';
import { ScreenNavChrome, type MainScreenKey, useAppNav } from '../navigation/AppNavigation';
import { refreshEmocareConfig } from '../../utils/emocareApi';
import { hapticLight } from '../../utils/haptics';
import { isWebInstallSupported, useWebInstallPrompt } from '../../utils/webInstallPrompt';
import { openPrivacyPolicy, openSupport, openTermsOfService } from '../../constants/legalLinks';
import {
  DEFAULT_CRISIS_REGION,
  getCrisisLine,
  openCrisisCall,
  openCrisisText,
} from '../../utils/crisisLine';
import { tokens } from '../../theme/tokens';
import { NotificationSheet } from '../home/NotificationSheet';

const NAV_CONTENT_HEIGHT = 72;

type Settings = typeof DEFAULT_SETTINGS;

export function SettingsScreen({ onNav }: { onNav: (key: MainScreenKey) => void }) {
  const theme = useCircadianTheme();
  const insets = useSafeAreaInsets();
  const { userName } = useAppNav();
  const webInstall = useWebInstallPrompt();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [passcodeEnabled, setPasscodeEnabled] = useState(false);
  const [passcodeSheetOpen, setPasscodeSheetOpen] = useState(false);
  const [passcodeSheetMode, setPasscodeSheetMode] = useState<PasscodeSetupMode>('create');
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricLabel, setBiometricLabel] = useState('Face ID');
  const [remindersOpen, setRemindersOpen] = useState(false);
  const destructive = theme.isDark ? '#E87898' : '#D46BA8';
  const destructiveBg = theme.isDark ? 'rgba(120,30,60,0.45)' : 'rgba(212,107,168,0.15)';

  const remindersValue =
    settings.notificationsEnabled === false
      ? 'Off'
      : `On · ${settings.notificationTime || '8:00 PM'}`;

  const refresh = useCallback(async () => {
    await refreshEmocareConfig();
    const [s, passcodeOn, support] = await Promise.all([
      loadSettings(),
      isPasscodeEnabled(),
      getBiometricSupport(),
    ]);
    setPasscodeEnabled(passcodeOn);
    setBiometricAvailable(support.available);
    setBiometricLabel(support.label);
    setSettings({
      ...s,
      timezone: formatTimezoneLabel(),
    });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const patch = async (partial: Partial<Settings>) => {
    const next = await saveSettings(partial);
    setSettings(next);
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

  const handlePasscodeToggle = (next: boolean) => {
    void hapticLight();
    if (next) {
      setPasscodeSheetMode('create');
      setPasscodeSheetOpen(true);
      return;
    }
    setPasscodeSheetMode('disable');
    setPasscodeSheetOpen(true);
  };

  const handleBiometricToggle = async (next: boolean) => {
    void hapticLight();
    if (!passcodeEnabled) return;

    if (next) {
      const result = await promptBiometricUnlock(biometricLabel, 'setup');
      if (!result.success) {
        const message = describeBiometricError(result.reason, biometricLabel);
        if (message) Alert.alert(biometricLabel, message);
        return;
      }
      await patch({ biometricUnlockEnabled: true });
      return;
    }

    await patch({ biometricUnlockEnabled: false });
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Delete all data?',
      'This permanently removes your check-ins, journal entries, memories, chat history, Mira insights, and app data from this device. Your name and app settings stay.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All Data',
          style: 'destructive',
          onPress: () => {
            void deleteAllUserData().then(() => {
              triggerAppReset();
              Alert.alert('Data deleted', 'Your sanctuary has been reset. Welcome begins again.');
            });
          },
        },
      ],
    );
  };

  const primarySwitchTrack = { false: theme.border, true: tokens.brand.ctaStart };
  const crisisLine = getCrisisLine(DEFAULT_CRISIS_REGION);

  return (
    <View style={styles.flex}>
      <CircadianHeroGlow theme={theme} />
      <ScreenSafeArea extraTop={4}>
        <View style={styles.chromeWrap}>
          <ScreenNavChrome theme={theme} title="Settings" />
        </View>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection theme={theme} label="ACCOUNT">
          <SettingRow theme={theme} label="Name" value={userName.trim() || 'Not set'} />
          <Pressable
            onPress={() => {
              void hapticLight();
              setRemindersOpen(true);
            }}
            style={[styles.linkRow, { borderBottomColor: theme.border }]}
            accessibilityRole="button"
            accessibilityLabel={`Daily reminders, ${remindersValue}`}
          >
            <View style={styles.switchLabelCol}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>Daily reminders</Text>
              <Text style={[styles.rowHint, { color: theme.mutedText }]}>
                Choose a preferred check-in time. Push delivery is still rolling out.
              </Text>
            </View>
            <View style={styles.linkAction}>
              <Text style={[styles.linkActionText, { color: theme.mutedText }]}>{remindersValue}</Text>
              <ChevronRight size={14} color={getCircadianIconColor(theme, 'muted')} />
            </View>
          </Pressable>
          <SettingRow theme={theme} label="Timezone" value={settings.timezone} />
          <View style={styles.languageBlock}>
            <Text style={[styles.rowLabel, { color: theme.text, flex: 0, paddingRight: 0 }]}>
              {(settings.chatLanguage || 'auto') === 'pt-BR'
                ? 'Idioma da Emo'
                : (settings.chatLanguage || 'auto') === 'fr'
                  ? 'Langue d’Emo'
                  : (settings.chatLanguage || 'auto') === 'id'
                    ? 'Bahasa Emo'
                    : 'Emo language'}
            </Text>
            <Text
              style={[
                styles.rowHint,
                styles.languageHint,
                { color: theme.mutedText },
              ]}
            >
              {getEmoLanguageSettingsHint(settings.chatLanguage)}
            </Text>
            <View style={styles.languageChipRow}>
              {getChatLanguageOptionsForUi(settings.chatLanguage).map((option) => {
                const selected = (settings.chatLanguage || 'auto') === option.id;
                const myanmarChip = textNeedsMyanmarMetrics(option.shortLabel);
                const labelMetrics = localeTextMetrics(option.shortLabel, {
                  fontSize: 13,
                  englishLineHeight: 18,
                  englishPaddingV: 0,
                });
                return (
                  <Pressable
                    key={option.id}
                    onPress={() => {
                      void hapticLight();
                      void patch({ chatLanguage: option.id });
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={getChatLanguageAccessibilityLabel(
                      settings.chatLanguage,
                      option.id,
                    )}
                    style={[
                      styles.languageChip,
                      myanmarChip && styles.languageChipMyanmar,
                      {
                        borderColor: selected ? tokens.brand.ctaStart : theme.border,
                        backgroundColor: selected ? `${tokens.brand.ctaStart}22` : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.languageChipText,
                        {
                          color: selected ? tokens.brand.ctaStart : theme.mutedText,
                          fontWeight: selected ? '700' : '500',
                          lineHeight: labelMetrics.lineHeight,
                          ...(myanmarChip
                            ? {
                                fontFamily: undefined,
                                paddingTop: 2,
                                paddingBottom: 1,
                                overflow: 'visible' as const,
                              }
                            : null),
                        },
                      ]}
                      allowFontScaling
                    >
                      {option.shortLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
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
          <View style={[styles.switchRow, { borderBottomColor: theme.border }]}>
            <View style={styles.switchLabelCol}>
              <Text style={[styles.rowLabel, { color: theme.text }]}>App passcode</Text>
              <Text style={[styles.rowHint, { color: theme.mutedText }]}>
                Lock EmoCare when you leave the app.
              </Text>
            </View>
            <View style={styles.switchValueCol}>
              <Text style={[styles.switchState, { color: theme.mutedText }]}>
                {passcodeEnabled ? 'On' : 'Off'}
              </Text>
              <Switch
                value={passcodeEnabled}
                onValueChange={handlePasscodeToggle}
                trackColor={primarySwitchTrack}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {passcodeEnabled ? (
            <Pressable
              onPress={() => {
                void hapticLight();
                setPasscodeSheetMode('change');
                setPasscodeSheetOpen(true);
              }}
              style={[styles.linkRow, { borderBottomColor: theme.border }]}
              accessibilityRole="button"
              accessibilityLabel="Change passcode"
            >
              <Text style={[styles.rowLabel, { color: theme.text }]}>Change passcode</Text>
              <ChevronRight size={14} color={getCircadianIconColor(theme, 'muted')} />
            </Pressable>
          ) : null}

          {passcodeEnabled && biometricAvailable ? (
            <View style={[styles.switchRow, { borderBottomColor: theme.border }]}>
              <View style={styles.switchLabelCol}>
                <Text style={[styles.rowLabel, { color: theme.text }]}>{biometricLabel}</Text>
                <Text style={[styles.rowHint, { color: theme.mutedText }]}>
                  Unlock with {biometricLabel} after your passcode is set.
                </Text>
              </View>
              <View style={styles.switchValueCol}>
                <Text style={[styles.switchState, { color: theme.mutedText }]}>
                  {settings.biometricUnlockEnabled ? 'On' : 'Off'}
                </Text>
                <Switch
                  value={settings.biometricUnlockEnabled === true}
                  onValueChange={(v) => void handleBiometricToggle(v)}
                  trackColor={primarySwitchTrack}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>
          ) : null}

          <Pressable onPress={() => onNav('memoryledger')} style={[styles.linkRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Memory Ledger</Text>
            <View style={styles.linkAction}>
              <Text style={[styles.linkActionText, { color: theme.mutedText }]}>View </Text>
              <ChevronRight size={14} color={getCircadianIconColor(theme, 'muted')} />
            </View>
          </Pressable>
          <Pressable
            onPress={openPrivacyPolicy}
            style={[styles.linkRow, { borderBottomColor: theme.border }]}
          >
            <Text style={[styles.rowLabel, { color: theme.text }]}>Privacy Policy</Text>
            <View style={styles.linkAction}>
              <Text style={[styles.linkActionText, { color: theme.mutedText }]}>View </Text>
              <ChevronRight size={14} color={getCircadianIconColor(theme, 'muted')} />
            </View>
          </Pressable>
          <Pressable
            onPress={openTermsOfService}
            style={[styles.linkRow, { borderBottomColor: theme.border }]}
          >
            <Text style={[styles.rowLabel, { color: theme.text }]}>Terms of Service</Text>
            <View style={styles.linkAction}>
              <Text style={[styles.linkActionText, { color: theme.mutedText }]}>View </Text>
              <ChevronRight size={14} color={getCircadianIconColor(theme, 'muted')} />
            </View>
          </Pressable>
          <Pressable
            onPress={() => void exportUserData()}
            style={[styles.linkRow, { borderBottomColor: theme.border }]}
          >
            <Text style={[styles.rowLabel, { color: theme.text }]}>Export my data</Text>
            <View style={styles.linkAction}>
              <Text style={[styles.linkActionText, { color: theme.mutedText }]}>Export </Text>
              <ChevronRight size={14} color={getCircadianIconColor(theme, 'muted')} />
            </View>
          </Pressable>
          <Pressable onPress={openSupport} style={styles.linkRow}>
            <Text style={[styles.rowLabel, { color: theme.text }]}>Help & Support</Text>
            <View style={styles.linkAction}>
              <Text style={[styles.linkActionText, { color: theme.mutedText }]}>Open </Text>
              <ChevronRight size={14} color={getCircadianIconColor(theme, 'muted')} />
            </View>
          </Pressable>
        </SettingsSection>

        <SettingsSection theme={theme} label="SAFETY & SUPPORT">
          <View style={styles.safetyBlock}>
            <Text style={[styles.safetyIntro, { color: theme.secondaryText }]}>
              If you are in crisis or may hurt yourself, please contact local emergency services or a
              crisis helpline immediately.
            </Text>
            {crisisLine.phone ? (
              <>
                <Pressable
                  onPress={() => {
                    void hapticLight();
                    openCrisisCall(crisisLine.phone);
                  }}
                  style={[styles.crisisActionRow, { borderBottomColor: theme.border }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Call crisis line ${crisisLine.display}`}
                >
                  <View style={styles.crisisActionLeft}>
                    <Phone size={16} color={theme.accent} strokeWidth={2.2} />
                    <Text style={[styles.rowLabel, { color: theme.text }]}>
                      Call {crisisLine.display}
                    </Text>
                  </View>
                  <ChevronRight size={14} color={getCircadianIconColor(theme, 'muted')} />
                </Pressable>
                <Pressable
                  onPress={() => {
                    void hapticLight();
                    openCrisisText(crisisLine.sms);
                  }}
                  style={[styles.crisisActionRow, { borderBottomColor: theme.border }]}
                  accessibilityRole="button"
                  accessibilityLabel={`Text crisis line ${crisisLine.display}`}
                >
                  <View style={styles.crisisActionLeft}>
                    <MessageCircle size={16} color={theme.accent} strokeWidth={2.2} />
                    <Text style={[styles.rowLabel, { color: theme.text }]}>
                      Text {crisisLine.display}
                    </Text>
                  </View>
                  <ChevronRight size={14} color={getCircadianIconColor(theme, 'muted')} />
                </Pressable>
                <Text style={[styles.safetyCompanion, { color: theme.mutedText }]}>
                  EmoCare is a companion app — Emo is not emergency care.
                </Text>
              </>
            ) : (
              <CrisisFooter theme={theme} variant="full" align="left" style={styles.crisisFooterInCard} />
            )}
          </View>
        </SettingsSection>

        <SettingsSection theme={theme} label="ABOUT">
          <SettingRow
            theme={theme}
            label="App version"
            value={`${Constants.expoConfig?.version ?? '1.0.0'}`}
            last
          />
        </SettingsSection>

        <Text style={[styles.safetyNote, { color: theme.mutedText }]}>
          EmoCare is for emotional reflection and personal growth. It is not medical care, therapy,
          diagnosis, treatment, or crisis support. Intended for users 18 and older.
        </Text>

        <Pressable
          onPress={handleDeleteAll}
          style={[styles.deleteBtn, { backgroundColor: destructiveBg, borderColor: `${destructive}55` }]}
        >
          <Text style={[styles.deleteText, { color: destructive }]}>Delete all data</Text>
        </Pressable>
      </ScrollView>

      <NotificationSheet
        visible={remindersOpen}
        theme={theme}
        onClose={() => setRemindersOpen(false)}
        onSaved={(enabled, time) => {
          setSettings((prev) => ({
            ...prev,
            notificationsEnabled: enabled,
            notificationTime: time,
          }));
        }}
      />

      <PasscodeSetupSheet
        visible={passcodeSheetOpen}
        theme={theme}
        mode={passcodeSheetMode}
        onClose={() => setPasscodeSheetOpen(false)}
        onEnabled={() => {
          setPasscodeEnabled(true);
          void refresh();
        }}
        onDisabled={() => {
          setPasscodeEnabled(false);
          void patch({ biometricUnlockEnabled: false });
        }}
      />
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
      <Text style={[styles.rowValue, { color: theme.mutedText }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  chromeWrap: { paddingHorizontal: 8, paddingBottom: 4 },
  sectionWrap: { marginBottom: 32 },
  sectionLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, marginBottom: 10, marginLeft: 4 },
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
    gap: 12,
  },
  switchLabelCol: { flex: 1, minWidth: 0, paddingRight: 8 },
  switchValueCol: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 },
  switchState: { fontSize: 14, fontWeight: '600', minWidth: 28, textAlign: 'right' },
  rowHint: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  languageHint: {
    lineHeight: 20,
    marginBottom: 10,
    overflow: 'visible',
  },
  rowLabel: { fontSize: 17, lineHeight: 22, flex: 1, minWidth: 0, paddingRight: 12 },
  rowValue: { fontSize: 16, flexShrink: 0, maxWidth: '42%', textAlign: 'right' },
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
  languageBlock: {
    paddingHorizontal: 4,
    paddingTop: 14,
    paddingBottom: 10,
  },
  languageChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  languageChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  languageChipMyanmar: {
    paddingTop: 12,
    paddingBottom: 11,
    minHeight: 48,
  },
  languageChipText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    overflow: 'visible',
  },
  safetyNote: {
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 6,
    marginBottom: 12,
  },
  deleteBtn: {
    marginTop: 6,
    borderRadius: 28,
    minHeight: 56,
    paddingVertical: 18,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
  },
  deleteText: { fontWeight: '700', fontSize: 16 },
  safetyBlock: {
    paddingHorizontal: 4,
    paddingTop: 6,
    paddingBottom: 12,
  },
  safetyIntro: {
    fontSize: 14,
    lineHeight: 21,
    paddingHorizontal: 4,
    marginBottom: 10,
  },
  crisisActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  crisisActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  crisisFooterInCard: {
    marginTop: 4,
    paddingHorizontal: 4,
  },
  safetyCompanion: {
    fontSize: 13,
    lineHeight: 20,
    paddingHorizontal: 4,
    marginTop: 12,
  },
});
