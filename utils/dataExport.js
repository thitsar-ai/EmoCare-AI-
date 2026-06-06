import { Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AGE_VERIFIED_KEY } from './ageVerification';
import { ORACLE_SAVED_INSIGHTS_KEY } from './oracleSavedInsights';
import { JOURNAL_ENTRIES_KEY, PENDING_JOURNAL_CONTEXT_KEY } from './journalStorage';
import {
  HOME_LANDING_MODE_KEY,
  INITIAL_CHECKIN_PAYLOAD_KEY,
  INITIAL_EMO_INTENT_KEY,
} from './onboardingLanding';
import { HELPED_STORAGE_KEY } from './thingsThatHelped';
import { VOICE_VOLUME_KEY } from './voiceVolume';

const EXPORT_KEYS = [
  'userName',
  'onboarded',
  AGE_VERIFIED_KEY,
  'checkIns',
  JOURNAL_ENTRIES_KEY,
  'emoMemoryLedger',
  'emoMemoryContextItems',
  'emoMemoryMilestones',
  'oracleTopicLog',
  ORACLE_SAVED_INSIGHTS_KEY,
  'oracleChatCurrent',
  'chatCurrent',
  'chatSaved',
  'todayTriageTasks',
  'emoAppSettings',
  'chatVoiceAloudEnabled',
  'pendingTalkQuery',
  PENDING_JOURNAL_CONTEXT_KEY,
  HELPED_STORAGE_KEY,
  HOME_LANDING_MODE_KEY,
  INITIAL_EMO_INTENT_KEY,
  INITIAL_CHECKIN_PAYLOAD_KEY,
  VOICE_VOLUME_KEY,
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
  await AsyncStorage.removeItem(AGE_VERIFIED_KEY);
}
