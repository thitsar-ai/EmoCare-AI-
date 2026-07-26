import AsyncStorage from '@react-native-async-storage/async-storage';

/** Permission-based personal memories the user asked Emo to keep. */
export const PERSONAL_MEMORIES_KEY = 'emoPersonalMemories';

const MAX_ENTRIES = 60;
const MIN_SUGGEST_LEN = 28;

export const PERSONAL_MEMORY_CATEGORIES = [
  { id: 'people', label: 'People who matter', ledgerCategory: 'relationships' },
  { id: 'helps', label: 'What helps me', ledgerCategory: 'growth' },
  { id: 'overwhelms', label: 'What overwhelms me', ledgerCategory: 'challenges' },
  { id: 'working_on', label: "Things I'm working on", ledgerCategory: 'growth' },
];

const SOURCE_LABELS = {
  talk: 'Talk conversation',
  checkin: 'Check-In',
  journal: 'Journal',
  manual: 'Saved by you',
};

function parseList(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeMemory(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const text = String(raw.text || raw.fact || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return null;
  const source = raw.source || 'talk';
  return {
    id: raw.id || `mem-${Date.now()}`,
    /** Short, clear fact Emo may recall. */
    text: text.slice(0, 280),
    /** Original supporting text — never re-summarize away from this. */
    sourceText: String(raw.sourceText || raw.originalText || text).slice(0, 600),
    source,
    sourceLabel: raw.sourceLabel || SOURCE_LABELS[source] || 'Talk conversation',
    category: PERSONAL_MEMORY_CATEGORIES.some((c) => c.id === raw.category)
      ? raw.category
      : 'helps',
    date: raw.date || new Date().toISOString(),
    confirmedByUser: raw.confirmedByUser !== false,
    emoMayUse: raw.emoMayUse !== false,
  };
}

export async function loadPersonalMemories() {
  const raw = await AsyncStorage.getItem(PERSONAL_MEMORIES_KEY);
  return parseList(raw)
    .map(normalizeMemory)
    .filter(Boolean);
}

/** Only memories the user confirmed and allowed Emo to use. */
export async function loadConfirmedUsableMemories() {
  const all = await loadPersonalMemories();
  return all.filter((m) => m.confirmedByUser && m.emoMayUse);
}

/**
 * @param {{
 *   text: string;
 *   category?: string;
 *   source?: string;
 *   sourceText?: string;
 *   sourceLabel?: string;
 *   confirmedByUser?: boolean;
 *   emoMayUse?: boolean;
 * }} args
 */
export async function savePersonalMemory({
  text,
  category = 'helps',
  source = 'talk',
  sourceText,
  sourceLabel,
  confirmedByUser = true,
  emoMayUse = true,
}) {
  const trimmed = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (trimmed.length < 8) return null;

  const supporting = String(sourceText || trimmed)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 600);

  const list = await loadPersonalMemories();
  const entry = normalizeMemory({
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: trimmed.slice(0, 280),
    sourceText: supporting,
    source: source || 'talk',
    sourceLabel: sourceLabel || SOURCE_LABELS[source] || 'Talk conversation',
    category,
    date: new Date().toISOString(),
    confirmedByUser: confirmedByUser !== false,
    emoMayUse: emoMayUse !== false,
  });
  if (!entry) return null;

  list.unshift(entry);
  await AsyncStorage.setItem(PERSONAL_MEMORIES_KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
  return entry;
}

/**
 * @param {string} id
 * @param {{ text?: string; category?: string; emoMayUse?: boolean; confirmedByUser?: boolean }} patch
 */
export async function updatePersonalMemory(id, patch) {
  const list = await loadPersonalMemories();
  const idx = list.findIndex((m) => m.id === id);
  if (idx < 0) return null;

  const current = list[idx];
  const nextText =
    patch.text != null
      ? String(patch.text)
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 280)
      : current.text;
  if (nextText.length < 8) return null;

  const updated = normalizeMemory({
    ...current,
    ...patch,
    text: nextText,
    // Keep original source text; do not replace with a re-summary of a summary.
    sourceText: current.sourceText,
    confirmedByUser: patch.confirmedByUser != null ? patch.confirmedByUser : current.confirmedByUser,
    emoMayUse: patch.emoMayUse != null ? patch.emoMayUse : current.emoMayUse,
  });
  list[idx] = updated;
  await AsyncStorage.setItem(PERSONAL_MEMORIES_KEY, JSON.stringify(list));
  return updated;
}

export async function setPersonalMemoryEmoMayUse(id, emoMayUse) {
  return updatePersonalMemory(id, { emoMayUse: Boolean(emoMayUse) });
}

export async function deletePersonalMemory(id) {
  const list = await loadPersonalMemories();
  const next = list.filter((m) => m.id !== id);
  await AsyncStorage.setItem(PERSONAL_MEMORIES_KEY, JSON.stringify(next));
  return next;
}

export async function clearPersonalMemories() {
  await AsyncStorage.removeItem(PERSONAL_MEMORIES_KEY);
}

/** Short candidate from what the user shared — never invents details. */
export function buildMemorySuggestion(userText) {
  const cleaned = String(userText || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length < MIN_SUGGEST_LEN) return null;
  if (cleaned.length <= 140) return cleaned;
  return `${cleaned.slice(0, 139)}…`;
}

export function inferPersonalMemoryCategory(text) {
  const lower = String(text || '').toLowerCase();
  if (/\b(mom|dad|mother|father|friend|partner|family|sister|brother|wife|husband|kids?|child|son|daughter)\b/.test(lower)) {
    return 'people';
  }
  if (/\b(overwhelm|stress|anxious|anxiety|too much|hard when|trigger|panic|exhaust)\b/.test(lower)) {
    return 'overwhelms';
  }
  if (/\b(help|helps|calm|better when|easier when|prefer|like|quiet|breath|ground|rest)\b/.test(lower)) {
    return 'helps';
  }
  return 'working_on';
}

/**
 * Offer save once after a meaningful Talk exchange.
 * @param {{ userText: string; exchangeCount: number; alreadyOffered: boolean; inCrisis?: boolean }} args
 */
export function shouldOfferSaveMemory({ userText, exchangeCount, alreadyOffered, inCrisis }) {
  if (alreadyOffered || inCrisis) return false;
  if (exchangeCount < 1) return false;
  return Boolean(buildMemorySuggestion(userText));
}

export function personalCategoryToLedger(categoryId) {
  return (
    PERSONAL_MEMORY_CATEGORIES.find((c) => c.id === categoryId)?.ledgerCategory || 'reflection'
  );
}

export function formatMemorySourceLine(memory) {
  if (!memory) return '';
  let dateLabel = '';
  try {
    dateLabel = new Date(memory.date).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    });
  } catch {
    dateLabel = '';
  }
  const source = memory.sourceLabel || SOURCE_LABELS[memory.source] || 'Talk conversation';
  return dateLabel ? `${source} · ${dateLabel}` : source;
}

/**
 * Neutral mood reflection — observes change, never claims Emo caused it.
 * Unchanged mood is awareness, not failure.
 */
export function formatMoodDeltaObservation(moodBefore, moodAfter) {
  const before = String(moodBefore || '').trim();
  const after = String(moodAfter || '').trim();
  if (!after) return '';
  if (!before) {
    return `You're feeling ${after} right now.`;
  }
  if (before.toLowerCase() === after.toLowerCase()) {
    return `You still feel ${after}. That's okay—feelings do not always change immediately.`;
  }
  return `You started feeling ${before} and now feel ${after}.`;
}
