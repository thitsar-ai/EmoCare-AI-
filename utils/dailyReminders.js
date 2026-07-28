/**
 * Daily local reminders via expo-notifications.
 * Preference is stored in settings; this module schedules / cancels the OS notification.
 */

import { Alert, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { loadSettings, saveSettings } from './settingsStorage.js';
import { parseReminderTimeLabel } from './reminderTime.js';

export { parseReminderTimeLabel } from './reminderTime.js';

export const DAILY_REMINDER_ID = 'emocare-daily-reminder';
export const DAILY_REMINDER_CHANNEL = 'daily-reminders';

let handlerConfigured = false;

function ensureHandler() {
  if (handlerConfigured || Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  handlerConfigured = true;
}

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(DAILY_REMINDER_CHANNEL, {
    name: 'Daily reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 180],
    lightColor: '#9B7BFF',
  });
}

/**
 * @returns {Promise<boolean>}
 */
export async function ensureReminderPermissions() {
  if (Platform.OS === 'web') return false;
  ensureHandler();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }
  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });
  return Boolean(
    requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL,
  );
}

export async function cancelDailyReminder() {
  if (Platform.OS === 'web') return;
  ensureHandler();
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
  } catch {}
}

/**
 * Schedule or cancel the repeating daily reminder from user preference.
 * @param {{ enabled?: boolean, time?: string, requestPermission?: boolean, alertOnDenied?: boolean }} [opts]
 * @returns {Promise<{ enabled: boolean, time: string, scheduled: boolean, permissionDenied?: boolean }>}
 */
export async function syncDailyReminder(opts = {}) {
  const settings = await loadSettings();
  const time = opts.time ?? settings.notificationTime ?? '8:00 PM';
  let enabled = opts.enabled ?? settings.notificationsEnabled !== false;

  if (Platform.OS === 'web') {
    if (opts.enabled != null || opts.time != null) {
      await saveSettings({ notificationsEnabled: enabled, notificationTime: time });
    }
    return { enabled: false, time, scheduled: false };
  }

  ensureHandler();
  await ensureAndroidChannel();

  if (!enabled) {
    await cancelDailyReminder();
    if (opts.enabled != null || opts.time != null) {
      await saveSettings({ notificationsEnabled: false, notificationTime: time });
    }
    return { enabled: false, time, scheduled: false };
  }

  const requestPermission = opts.requestPermission !== false;
  const permitted = requestPermission
    ? await ensureReminderPermissions()
    : (await Notifications.getPermissionsAsync()).granted;

  if (!permitted) {
    await cancelDailyReminder();
    // Active save attempt: turn preference off. Silent boot sync: keep preference.
    if (requestPermission) {
      await saveSettings({ notificationsEnabled: false, notificationTime: time });
      if (opts.alertOnDenied !== false) {
        Alert.alert(
          'Notifications unavailable',
          'To receive daily reminders, allow notifications for EmoCare in your device Settings.',
        );
      }
      return { enabled: false, time, scheduled: false, permissionDenied: true };
    }
    return { enabled: true, time, scheduled: false, permissionDenied: true };
  }

  const { hour, minute } = parseReminderTimeLabel(time);
  await cancelDailyReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: 'EmoCare',
      body: 'A gentle moment for you — how are you feeling today?',
      sound: true,
      data: { kind: 'daily-reminder' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      ...(Platform.OS === 'android' ? { channelId: DAILY_REMINDER_CHANNEL } : {}),
    },
  });

  await saveSettings({ notificationsEnabled: true, notificationTime: time });
  return { enabled: true, time, scheduled: true };
}

/** Re-apply saved preference after launch (no permission prompt unless already granted). */
export async function syncDailyReminderOnLaunch() {
  if (Platform.OS === 'web') return;
  try {
    const settings = await loadSettings();
    if (settings.notificationsEnabled === false) {
      await cancelDailyReminder();
      return;
    }
    await syncDailyReminder({
      enabled: true,
      time: settings.notificationTime || '8:00 PM',
      requestPermission: false,
      alertOnDenied: false,
    });
  } catch {}
}
