import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  MEMORY_CATEGORIES,
  PERSONAL_MEMORY_CATEGORIES,
  resolveMemoryCategory,
} from './memoryCategories.js';
import { clearMemoryDiagnostics, removeDiagnosticsForMemoryId } from './memoryDiagnostics.js';
import {
  finishFirstPersonMemory,
  isNearDuplicateMemory,
  MEMORY_DEDUP_THRESHOLD,
  tokenSetRatio,
} from './memoryText.js';

export { MEMORY_CATEGORIES, PERSONAL_MEMORY_CATEGORIES, resolveMemoryCategory };
export { MEMORY_DEDUP_THRESHOLD, tokenSetRatio, isNearDuplicateMemory };

/** Permission-based personal memories the user asked Emo to keep. */
export const PERSONAL_MEMORIES_KEY = 'emoPersonalMemories';

const MAX_ENTRIES = 60;

const SOURCE_LABELS = {
  talk: 'Talk',
  manual: 'Manual save',
  checkin: 'Check-In',
  journal: 'Journal',
  onboarding: 'Onboarding',
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
  const text = finishFirstPersonMemory(raw.text || raw.fact || '');
  if (!text) return null;
  const cat = resolveMemoryCategory(raw.category) || resolveMemoryCategory('helps');
  const source = raw.source || 'talk';
  return {
    id: raw.id || `mem-${Date.now()}`,
    text: text.slice(0, 120),
    sourceText: String(raw.sourceText || raw.originalText || text).slice(0, 600),
    source,
    sourceLabel: raw.sourceLabel || SOURCE_LABELS[source] || 'Talk',
    category: cat.id,
    categoryLabel: cat.label,
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

export async function loadConfirmedUsableMemories() {
  const all = await loadPersonalMemories();
  return all.filter((m) => m.confirmedByUser && m.emoMayUse);
}

export function findNearDuplicate(text, memories, threshold = MEMORY_DEDUP_THRESHOLD) {
  return (memories || []).find((m) => isNearDuplicateMemory(text, m.text, threshold)) || null;
}

export function isNearDuplicateOfAny(text, memories, threshold = MEMORY_DEDUP_THRESHOLD) {
  return Boolean(findNearDuplicate(text, memories, threshold));
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
 *   allowDuplicate?: boolean;
 *   replaceId?: string | null;
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
  allowDuplicate = false,
  replaceId = null,
}) {
  const trimmed = finishFirstPersonMemory(text);
  if (trimmed.length < 6) return null;

  let list = await loadPersonalMemories();
  if (replaceId) {
    list = list.filter((m) => m.id !== replaceId);
  }

  const dup = findNearDuplicate(trimmed, list);
  if (dup && !allowDuplicate && !replaceId) {
    return { duplicate: true, existing: dup };
  }

  const cat = resolveMemoryCategory(category) || resolveMemoryCategory('helps');
  const entry = normalizeMemory({
    id: `mem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: trimmed,
    sourceText: String(sourceText || trimmed).slice(0, 600),
    source: source || 'talk',
    sourceLabel: sourceLabel || SOURCE_LABELS[source] || 'Talk',
    category: cat.id,
    date: new Date().toISOString(),
    confirmedByUser: confirmedByUser !== false,
    emoMayUse: emoMayUse !== false,
  });
  if (!entry) return null;

  list.unshift(entry);
  await AsyncStorage.setItem(PERSONAL_MEMORIES_KEY, JSON.stringify(list.slice(0, MAX_ENTRIES)));
  return entry;
}

export async function updatePersonalMemory(id, patch) {
  const list = await loadPersonalMemories();
  const idx = list.findIndex((m) => m.id === id);
  if (idx < 0) return null;

  const current = list[idx];
  const nextText =
    patch.text != null ? finishFirstPersonMemory(patch.text) : current.text;
  if (nextText.length < 6) return null;

  const others = list.filter((m) => m.id !== id);
  if (isNearDuplicateOfAny(nextText, others)) {
    return { duplicate: true };
  }

  const cat = resolveMemoryCategory(patch.category || current.category) || resolveMemoryCategory(current.category);
  const updated = normalizeMemory({
    ...current,
    ...patch,
    text: nextText,
    sourceText: current.sourceText,
    category: cat.id,
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
  await removeDiagnosticsForMemoryId(id);
  return next;
}

export async function clearPersonalMemories() {
  await AsyncStorage.removeItem(PERSONAL_MEMORIES_KEY);
  await clearMemoryDiagnostics();
}

export function inferPersonalMemoryCategory(text) {
  const lower = String(text || '').toLowerCase();
  if (/\b(sister|brother|mom|dad|friend|partner|family)\b/.test(lower)) return 'people';
  if (/\b(prefer|advice|listen)\b/.test(lower)) return 'communicate';
  if (/\b(help|calm|quiet|walk)\b/.test(lower)) return 'helps';
  if (/\b(hard|overwhelm|trigger|stress)\b/.test(lower)) return 'hard';
  if (/\b(interview|friday|appointment|exam)\b/.test(lower)) return 'events';
  if (/\b(goal|working on|want to)\b/.test(lower)) return 'working_on';
  if (/\b(love|hate|like|dislike|prefer)\b/.test(lower)) return 'likes';
  return 'helps';
}

export function personalCategoryToLedger(categoryId) {
  return resolveMemoryCategory(categoryId)?.ledgerCategory || 'reflection';
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
  const source = memory.sourceLabel || SOURCE_LABELS[memory.source] || 'Talk';
  return dateLabel ? `${source} · ${dateLabel}` : source;
}

export function formatMoodDeltaObservation(moodBefore, moodAfter) {
  const before = String(moodBefore || '').trim();
  const after = String(moodAfter || '').trim();
  if (!after) return '';
  if (!before) return `You're feeling ${after} right now.`;
  if (before.toLowerCase() === after.toLowerCase()) {
    return `You still feel ${after}. That's okay—feelings do not always change immediately.`;
  }
  return `You started feeling ${before} and now feel ${after}.`;
}

/** @deprecated — use classifyMemoryEligibility */
export function buildMemorySuggestion(userText) {
  return finishFirstPersonMemory(userText);
}

/** @deprecated — use classifyMemoryEligibility */
export function evaluateMemoryEligibility() {
  return { eligible: false, proposedFact: null, category: 'helps' };
}

/** @deprecated */
export function shouldOfferSaveMemory() {
  return false;
}

export function proposeMemoryFact(userText) {
  return finishFirstPersonMemory(userText);
}
