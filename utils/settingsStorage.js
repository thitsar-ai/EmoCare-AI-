import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_CHAT_LANGUAGE, normalizeChatLanguage } from './chatLanguage.js';
import { DEFAULT_MIRA_LANGUAGE, normalizeMiraLanguage } from './miraLanguage.js';

export const SETTINGS_STORAGE_KEY = 'emoAppSettings';

export const DEFAULT_SETTINGS = {
  notificationsEnabled: true,
  notificationTime: '8:00 PM',
  timezone: 'US Eastern',
  circadianAuto: true,
  themeMode: 'auto',
  biometricUnlockEnabled: false,
  /** @type {import('./chatLanguage').ChatLanguageId} */
  chatLanguage: DEFAULT_CHAT_LANGUAGE,
  /** Mira response language (independent from Emo Talk). */
  miraLanguage: DEFAULT_MIRA_LANGUAGE,
};

export async function loadSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SETTINGS,
        ...parsed,
        chatLanguage: normalizeChatLanguage(parsed?.chatLanguage),
        miraLanguage: normalizeMiraLanguage(parsed?.miraLanguage),
      };
    }
  } catch {}
  return { ...DEFAULT_SETTINGS };
}

export async function saveSettings(partial) {
  const current = await loadSettings();
  const next = { ...current, ...partial };
  if (partial && Object.prototype.hasOwnProperty.call(partial, 'chatLanguage')) {
    next.chatLanguage = normalizeChatLanguage(partial.chatLanguage);
  }
  if (partial && Object.prototype.hasOwnProperty.call(partial, 'miraLanguage')) {
    next.miraLanguage = normalizeMiraLanguage(partial.miraLanguage);
  }
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
