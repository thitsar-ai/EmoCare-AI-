import AsyncStorage from '@react-native-async-storage/async-storage';

export const SETTINGS_STORAGE_KEY = 'emoAppSettings';

export const DEFAULT_SETTINGS = {
  notificationsEnabled: true,
  notificationTime: '8:00 PM',
  timezone: 'US Eastern',
  circadianAuto: true,
  themeMode: 'auto',
  biometricUnlockEnabled: false,
};

export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export async function saveSettings(partial) {
  const current = await loadSettings();
  const next = { ...current, ...partial };
  try {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
  } catch {}
  return next;
}

export function formatTimezoneLabel() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.includes('New_York') || tz.includes('Eastern')) return 'US Eastern';
    if (tz.includes('Chicago') || tz.includes('Central')) return 'US Central';
    if (tz.includes('Denver') || tz.includes('Mountain')) return 'US Mountain';
    if (tz.includes('Los_Angeles') || tz.includes('Pacific')) return 'US Pacific';
    return tz.replace(/_/g, ' ');
  } catch {
    return 'US Eastern';
  }
}
