import AsyncStorage from '@react-native-async-storage/async-storage';
import { JOURNAL_ENTRIES_KEY, JOURNAL_SOURCE_CARRY_THOUGHT } from './journalStorage';

const DRAFT_KEY = 'carryThoughtDraft';

function todayKey(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/** Load in-progress carry-thought text for today (not yet saved to journal). */
export async function loadCarryThoughtDraft() {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY);
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    if (parsed?.dateKey !== todayKey()) return '';
    return typeof parsed.text === 'string' ? parsed.text : '';
  } catch {
    return '';
  }
}

/** Persist draft locally — does not write to journal until saved. */
export async function persistCarryThoughtDraft(text) {
  await AsyncStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({ dateKey: todayKey(), text: typeof text === 'string' ? text : '' }),
  );
}

/**
 * Save or update today's carry-thought as a lightweight journal entry.
 * Clears today's carry-thought journal row when text is empty.
 */
export async function saveCarryThoughtToJournal(text) {
  const trimmed = typeof text === 'string' ? text.trim() : '';
  const key = todayKey();
  const raw = await AsyncStorage.getItem(JOURNAL_ENTRIES_KEY);
  const all = raw ? JSON.parse(raw) : [];

  const withoutToday = all.filter(
    (entry) => !(entry.source === JOURNAL_SOURCE_CARRY_THOUGHT && String(entry.date).slice(0, 10) === key),
  );

  if (!trimmed) {
    await AsyncStorage.setItem(JOURNAL_ENTRIES_KEY, JSON.stringify(withoutToday));
    return null;
  }

  const existing = all.find(
    (entry) => entry.source === JOURNAL_SOURCE_CARRY_THOUGHT && String(entry.date).slice(0, 10) === key,
  );

  const entry = {
    id: existing?.id ?? Date.now(),
    date: new Date().toISOString(),
    text: trimmed,
    mood: { emoji: '✨', label: 'Carry thought' },
    source: JOURNAL_SOURCE_CARRY_THOUGHT,
  };

  await AsyncStorage.setItem(JOURNAL_ENTRIES_KEY, JSON.stringify([entry, ...withoutToday]));
  return entry;
}
