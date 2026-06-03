import { Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const EXPORT_KEYS = [
  'userName',
  'onboarded',
  'checkIns',
  'journalEntries',
  'emoMemoryLedger',
  'emoMemoryContextItems',
  'emoMemoryMilestones',
  'oracleTopicLog',
  'todayTriageTasks',
  'emoAppSettings',
  'chatVoiceAloudEnabled',
  'pendingTalkQuery',
];

export async function gatherExportPayload() {
  const pairs = await AsyncStorage.multiGet(EXPORT_KEYS);
  const data = {};
  for (const [key, value] of pairs) {
    if (value == null) continue;
    try {
      data[key] = JSON.parse(value);
    } catch {
      data[key] = value;
    }
  }
  return {
    exportedAt: new Date().toISOString(),
    app: 'EmoCare',
    data,
  };
}

export async function exportUserData() {
  const payload = await gatherExportPayload();
  const json = JSON.stringify(payload, null, 2);
  await Share.share({
    message: json,
    title: 'EmoCare data export',
  });
  return json;
}

export async function deleteAllUserData() {
  await AsyncStorage.multiRemove(EXPORT_KEYS);
  await AsyncStorage.setItem('onboarded', 'false');
}
