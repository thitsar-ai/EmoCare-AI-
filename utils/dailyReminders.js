/**
 * Daily local reminders via expo-notifications.
 * Preference is stored in settings; this module schedules / cancels the OS notification.
 */

import { Alert, Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  DAILY_REMINDER_DATA_KIND,
  getDailyReminderCopy,
  getDailyReminderUiCopy,
  isDailyReminderResponse,
} from './dailyReminderCopy.js';
import { loadSettings, saveSettings } from './settingsStorage.js';
import { parseReminderTimeLabel } from './reminderTime.js';

export { parseReminderTimeLabel } from './reminderTime.js';
export {
  DAILY_REMINDER_COPY_BY_LOCALE,
  DAILY_REMINDER_COPY_EN,
  DAILY_REMINDER_DATA_KIND,
  DAILY_REMINDER_UI_BY_LOCALE,
  getDailyReminderCopy,
  getDailyReminderUiCopy,
  isDailyReminderResponse,
} from './dailyReminderCopy.js';

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

/**
 * @param {Notifications.NotificationPermissionsStatus} status
 */
function isPermissionGranted(status) {
  return Boolean(
    status?.granted || status?.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL,
  );
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
  if (isPermissionGranted(current)) return true;
  const requested = await Notifications.requestPermissionsAsync({
    ios: {
      allowAlert: true,
      allowBadge: false,
      allowSound: true,
    },
  });
  return isPermissionGranted(requested);
}

export async function cancelDailyReminder() {
  if (Platform.OS === 'web') return;
  ensureHandler();
  try {
    await Notifications.cancelScheduledNotificationAsync(DAILY_REMINDER_ID);
  } catch {}
}

/**
 * Subscribe to notification taps. Opens Check-In when kind is daily-reminder.
 * @param {(screen: 'checkin') => void} onOpenCheckIn
 * @returns {() => void} unsubscribe
 */
export function subscribeDailyReminderResponses(onOpenCheckIn) {
  if (Platform.OS === 'web') return () => {};
  ensureHandler();

  const openFromResponse = (response) => {
    if (!isDailyReminderResponse(response)) return;
    onOpenCheckIn('checkin');
    try {
      Notifications.clearLastNotificationResponse();
    } catch {}
  };

  const sub = Notifications.addNotificationResponseReceivedListener(openFromResponse);
  void Notifications.getLastNotificationResponseAsync().then(openFromResponse);
  return () => {
    try {
      sub.remove();
    } catch {}
  };
}

/**
 * Schedule or cancel the repeating daily reminder from user preference.
 * Uses device-local timezone (DAILY hour/minute). Content follows chatLanguage.
 * @param {{ enabled?: boolean, time?: string, locale?: string, requestPermission?: boolean, alertOnDenied?: boolean }} [opts]
 * @returns {Promise<{ enabled: boolean, time: string, scheduled: boolean, permissionDenied?: boolean }>}
 */
export async function syncDailyReminder(opts = {}) {
  const settings = await loadSettings();
  const time = opts.time ?? settings.notificationTime ?? '8:00 PM';
  let enabled = opts.enabled ?? settings.notificationsEnabled !== false;
  const locale = opts.locale ?? settings.chatLanguage ?? 'auto';
  const ui = getDailyReminderUiCopy(locale);

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
    : isPermissionGranted(await Notifications.getPermissionsAsync());

  if (!permitted) {
    await cancelDailyReminder();
    // Active save attempt: turn preference off. Silent boot sync: keep preference.
    if (requestPermission) {
      await saveSettings({ notificationsEnabled: false, notificationTime: time });
      if (opts.alertOnDenied !== false) {
        Alert.alert(ui.deniedTitle, ui.deniedBody, [
          { text: ui.cancel, style: 'cancel' },
          {
            text: ui.openSettings,
            onPress: () => {
              void Linking.openSettings();
            },
          },
        ]);
      }
      return { enabled: false, time, scheduled: false, permissionDenied: true };
    }
    return { enabled: true, time, scheduled: false, permissionDenied: true };
  }

  const { hour, minute } = parseReminderTimeLabel(time);
  const copy = getDailyReminderCopy(locale);
  await cancelDailyReminder();
  await Notifications.scheduleNotificationAsync({
    identifier: DAILY_REMINDER_ID,
    content: {
      title: copy.title,
      body: copy.body,
      sound: true,
      data: { kind: DAILY_REMINDER_DATA_KIND },
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
      locale: settings.chatLanguage,
      requestPermission: false,
      alertOnDenied: false,
    });
  } catch {}
}

/**
 * Reconcile stored preference with OS permission.
 * If preference is on but permission is missing, turn preference off (no prompt).
 * @returns {Promise<{ enabled: boolean, time: string, scheduled: boolean }>}
 */
export async function reconcileDailyReminderPreference() {
  const settings = await loadSettings();
  const time = settings.notificationTime || '8:00 PM';
  if (settings.notificationsEnabled === false) {
    await cancelDailyReminder();
    return { enabled: false, time, scheduled: false };
  }

  if (Platform.OS === 'web') {
    return { enabled: false, time, scheduled: false };
  }

  ensureHandler();
  const permitted = isPermissionGranted(await Notifications.getPermissionsAsync());
  if (!permitted) {
    await cancelDailyReminder();
    await saveSettings({ notificationsEnabled: false, notificationTime: time });
    return { enabled: false, time, scheduled: false, permissionDenied: true };
  }

  const result = await syncDailyReminder({
    enabled: true,
    time,
    locale: settings.chatLanguage,
    requestPermission: false,
    alertOnDenied: false,
  });
  return result;
}
