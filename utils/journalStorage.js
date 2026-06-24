import AsyncStorage from '@react-native-async-storage/async-storage';

/** AsyncStorage key for persisted journal entries. */
export const JOURNAL_ENTRIES_KEY = 'journalEntries';

/** @param {unknown} entry */
export function normalizeJournalEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const raw = /** @type {{ id?: number; date?: string; text?: string; mood?: { emoji?: string; label?: string } }} */ (entry);
  if (!raw.date || typeof raw.text !== 'string' || !raw.text.trim()) return null;

  return {
    id: typeof raw.id === 'number' ? raw.id : Date.parse(raw.date) || Date.now(),
    date: raw.date,
    text: raw.text.trim(),
    mood: {
      emoji: raw.mood?.emoji || '💜',
      label: raw.mood?.label || 'Reflective',
    },
  };
}

/** @returns {Promise<ReturnType<typeof normalizeJournalEntry>[]>} */
export async function loadJournalEntries() {
  try {
    const raw = await AsyncStorage.getItem(JOURNAL_ENTRIES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(normalizeJournalEntry)
      .filter(Boolean)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch {
    return [];
  }
}

/** @param {ReturnType<typeof normalizeJournalEntry>[]} entries */
export async function saveJournalEntries(entries) {
  await AsyncStorage.setItem(JOURNAL_ENTRIES_KEY, JSON.stringify(entries));
}

/** Pending journal snippet passed to Talk when user taps "Ask Emo about this". */
export const PENDING_JOURNAL_CONTEXT_KEY = 'pendingJournalContext';

export const JOURNAL_BG = '#F7F3FD';
export const JOURNAL_EDITOR_SURFACE = 'rgba(255, 255, 255, 0.65)';

export const JOURNAL_DAILY_PROMPTS = [
  'What deserves gratitude today?',
  'What is something your heart needs today?',
  'What would you say to yourself if you were your own best friend?',
  'What do you wish someone understood about you today?',
  'What felt heavy today — and what felt even a little lighter?',
  'If your heart could speak without fear, what would it say?',
  'What would gentleness look like for you right now?',
  'Where did you feel most like yourself today?',
];

export function pickDailyJournalPrompt(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0).getTime();
  const dayIndex = Math.floor((date.getTime() - start) / 86_400_000);
  return JOURNAL_DAILY_PROMPTS[dayIndex % JOURNAL_DAILY_PROMPTS.length];
}

/** @param {{ date: string }[]} entries */
export function countReflectionsThisMonth(entries, date = new Date()) {
  const month = date.getMonth();
  const year = date.getFullYear();
  return entries.filter((entry) => {
    if (!entry?.date) return false;
    const d = new Date(entry.date);
    return d.getMonth() === month && d.getFullYear() === year;
  }).length;
}

/** @param {{ date: string }[]} entries */
export function buildJourneyLine(entries, date = new Date()) {
  const count = countReflectionsThisMonth(entries, date);
  if (count === 0) {
    return 'Your first reflection this month is a beautiful beginning.';
  }
  if (count === 1) {
    return "You've reflected once this month.";
  }
  return `You've reflected ${count} times this month.`;
}
