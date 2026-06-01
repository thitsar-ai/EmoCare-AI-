import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './emoAnalytics';

const MAX_LOG_ENTRIES = 80;

/**
 * @param {{ message?: string; query?: string; sources?: { title?: string; url?: string }[] }} args
 */
export async function logOracleInquiry({ message, query, sources = [] }) {
  const trimmed = message?.trim();
  if (!trimmed) return;

  const raw = await AsyncStorage.getItem(STORAGE_KEYS.oracleLog);
  let log = [];
  try {
    log = raw ? JSON.parse(raw) : [];
  } catch {
    log = [];
  }

  log.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: new Date().toISOString(),
    message: trimmed.slice(0, 240),
    query: (query || trimmed).slice(0, 160),
    sourceTitles: sources.map((s) => s.title).filter(Boolean).slice(0, 4),
  });

  await AsyncStorage.setItem(STORAGE_KEYS.oracleLog, JSON.stringify(log.slice(0, MAX_LOG_ENTRIES)));
}

export async function loadOracleTopicLog() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.oracleLog);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}
