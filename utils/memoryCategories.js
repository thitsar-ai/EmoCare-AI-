/**
 * Canonical memory categories — single source of truth for v1.1.
 * Used by classifier, validation, confirmation card, picker, Ledger, filters, edit UI.
 * Never invent categories dynamically.
 */

export const MEMORY_CATEGORIES = [
  { id: 'people', label: 'People in my life', ledgerCategory: 'relationships' },
  { id: 'likes', label: 'Likes & dislikes', ledgerCategory: 'reflection' },
  { id: 'helps', label: 'What helps me', ledgerCategory: 'growth' },
  { id: 'hard', label: "What's hard for me", ledgerCategory: 'challenges' },
  { id: 'goals', label: 'Goals & priorities', ledgerCategory: 'growth' },
  { id: 'boundaries', label: 'Boundaries', ledgerCategory: 'challenges' },
  { id: 'communicate', label: 'How I like to communicate', ledgerCategory: 'reflection' },
  { id: 'events', label: 'Important events', ledgerCategory: 'milestones' },
  { id: 'values', label: 'My values', ledgerCategory: 'gratitude' },
  { id: 'working_on', label: "Things I'm working on", ledgerCategory: 'growth' },
];

export const MEMORY_CATEGORY_LABELS = MEMORY_CATEGORIES.map((c) => c.label);

/** @deprecated Use MEMORY_CATEGORIES — kept as alias for imports. */
export const PERSONAL_MEMORY_CATEGORIES = MEMORY_CATEGORIES;

const LEGACY_CATEGORY_MAP = {
  people: 'people',
  helps: 'helps',
  overwhelms: 'hard',
  working_on: 'working_on',
  likes: 'likes',
  hard: 'hard',
  goals: 'goals',
  boundaries: 'boundaries',
  communicate: 'communicate',
  events: 'events',
  values: 'values',
};

/**
 * @param {string | null | undefined} value id or exact label
 * @returns {{ id: string; label: string; ledgerCategory: string } | null}
 */
export function resolveMemoryCategory(value) {
  if (!value) return null;
  const trimmed = String(value).trim();
  const mappedId = LEGACY_CATEGORY_MAP[trimmed] || trimmed;
  const byId = MEMORY_CATEGORIES.find((c) => c.id === mappedId);
  if (byId) return byId;
  const byLabel = MEMORY_CATEGORIES.find(
    (c) => c.label.toLowerCase() === trimmed.toLowerCase(),
  );
  return byLabel || null;
}

export function isCanonicalMemoryCategory(value) {
  return Boolean(resolveMemoryCategory(value));
}

export function memoryCategoryLabel(idOrLabel) {
  return resolveMemoryCategory(idOrLabel)?.label || null;
}

export function memoryCategoryId(idOrLabel) {
  return resolveMemoryCategory(idOrLabel)?.id || null;
}
