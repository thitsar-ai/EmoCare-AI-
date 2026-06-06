import AsyncStorage from '@react-native-async-storage/async-storage';

export const ORACLE_SAVED_INSIGHTS_KEY = 'oracleSavedInsights';
const MAX_ENTRIES = 40;

/**
 * @param {{ query: string; insight: string; sourceCount?: number; sourceTitles?: string[] }} args
 */
export async function saveOracleInsight({ query, insight, sourceCount = 0, sourceTitles = [] }) {
  const trimmed = insight?.trim();
  if (!trimmed) return false;

  const raw = await AsyncStorage.getItem(ORACLE_SAVED_INSIGHTS_KEY);
  let list = [];
  try {
    list = raw ? JSON.parse(raw) : [];
  } catch {
    list = [];
  }

  list.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    date: new Date().toISOString(),
    query: (query || '').trim().slice(0, 200),
    insight: trimmed.slice(0, 1200),
    sourceCount: sourceCount || 0,
    sourceTitles: (sourceTitles || []).filter(Boolean).slice(0, 6),
  });

  await AsyncStorage.setItem(ORACLE_SAVED_INSIGHTS_KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
  return true;
}

export async function loadOracleSavedInsights() {
  const raw = await AsyncStorage.getItem(ORACLE_SAVED_INSIGHTS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
