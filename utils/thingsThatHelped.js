import AsyncStorage from '@react-native-async-storage/async-storage';

export const HELPED_STORAGE_KEY = 'emoThingsThatHelped';
export const HELPED_DISMISSED_KEY = 'emoHelpedDismissed';

/** Evidence-informed self-care domains (behavioral activation + NICE/WHO wellbeing). */
export const HELPED_CATEGORIES = {
  movement: {
    id: 'movement',
    label: 'Movement & Body',
    shortLabel: 'Movement',
    accent: '#3DBDA8',
    chipBg: 'rgba(61,189,168,0.15)',
    description: 'Gentle motion that releases tension and lifts mood.',
  },
  mind: {
    id: 'mind',
    label: 'Mind & Calm',
    shortLabel: 'Calm',
    accent: '#9B7BFF',
    chipBg: 'rgba(155,123,255,0.15)',
    description: 'Breath, pause, and nervous-system regulation.',
  },
  expression: {
    id: 'expression',
    label: 'Expression',
    shortLabel: 'Express',
    accent: '#E89B5C',
    chipBg: 'rgba(232,155,92,0.15)',
    description: 'Putting feelings into words or creative form.',
  },
  connection: {
    id: 'connection',
    label: 'Connection',
    shortLabel: 'Connect',
    accent: '#7BC67E',
    chipBg: 'rgba(123,198,126,0.15)',
    description: 'Warm contact with people who matter.',
  },
  rest: {
    id: 'rest',
    label: 'Rest & Joy',
    shortLabel: 'Joy',
    accent: '#6B7FD7',
    chipBg: 'rgba(107,127,215,0.15)',
    description: 'Pleasure and recovery without guilt.',
  },
  care: {
    id: 'care',
    label: 'Daily Care',
    shortLabel: 'Care',
    accent: '#C4A35A',
    chipBg: 'rgba(196,163,90,0.15)',
    description: 'Small routines that steady your day.',
  },
};

export const HELPED_CATEGORY_ORDER = [
  'movement',
  'mind',
  'expression',
  'connection',
  'rest',
  'care',
];

/**
 * @typedef {'journal' | 'talk' | 'checkin' | null} HelpedNavigate
 */

/**
 * @typedef {{
 *   id: string;
 *   categoryId: keyof typeof HELPED_CATEGORIES;
 *   title: string;
 *   sub: string;
 *   navigate: HelpedNavigate;
 *   tip: string;
 *   emoPrompt?: string;
 * }} HelpedCatalogItem
 */

/** @type {HelpedCatalogItem[]} */
export const HELPED_CATALOG = [
  {
    id: 'evening-walk',
    categoryId: 'movement',
    title: 'Evening walks',
    sub: 'felt calmer after',
    navigate: null,
    tip: 'Even a 10-minute walk after dinner can lower cortisol and help your mind detach from the day. No pace required — just movement and fresh air.',
    emoPrompt: 'Help me build a gentle evening walk routine that fits my energy',
  },
  {
    id: 'swimming',
    categoryId: 'movement',
    title: 'Swimming',
    sub: 'eased tension in your body',
    navigate: null,
    tip: 'Rhythmic, full-body movement and breath sync can soothe an anxious nervous system. Even light laps or floating counts.',
    emoPrompt: 'Swimming helped me feel better — help me understand why and how to repeat it',
  },
  {
    id: 'yoga-stretch',
    categoryId: 'movement',
    title: 'Yoga or stretching',
    sub: 'released physical stress',
    navigate: null,
    tip: 'Slow stretching signals safety to your body. Try 5 minutes of neck, shoulders, and hips before bed.',
  },
  {
    id: 'deep-breathing',
    categoryId: 'mind',
    title: 'Deep breathing',
    sub: 'reset your mind',
    navigate: 'talk',
    tip: 'Box breathing (4-4-4-4) is evidence-backed for acute stress. Emo can guide you through a short session in Talk.',
    emoPrompt: 'Guide me through box breathing for anxiety',
  },
  {
    id: 'meditation',
    categoryId: 'mind',
    title: 'Quiet meditation',
    sub: 'found stillness',
    navigate: 'talk',
    tip: 'Even 3 minutes of noticing breath without fixing anything builds emotional resilience over time. Emo can guide you gently in Talk.',
  },
  {
    id: 'journaling',
    categoryId: 'expression',
    title: 'Journaling',
    sub: 'released emotions',
    navigate: 'journal',
    tip: 'Writing externalizes looping thoughts. You do not need perfect prose — honesty is enough.',
  },
  {
    id: 'talk-emo',
    categoryId: 'expression',
    title: 'Talking with Emo',
    sub: 'felt heard',
    navigate: 'talk',
    tip: 'Naming feelings aloud (or in chat) reduces their intensity. Emo holds space without judgment.',
  },
  {
    id: 'creative-time',
    categoryId: 'expression',
    title: 'Creative time',
    sub: 'expressed something true',
    navigate: null,
    tip: 'Drawing, music, cooking, or any making can channel emotion safely. Process matters more than output.',
    emoPrompt: 'Creative time helped me — suggest gentle ways to express what I am feeling',
  },
  {
    id: 'calling-friend',
    categoryId: 'connection',
    title: 'Calling a friend',
    sub: 'felt less alone',
    navigate: 'talk',
    tip: 'Brief, genuine connection beats long performances. One honest check-in can shift an entire evening.',
    emoPrompt: 'Help me plan a gentle message to reach out to someone I trust',
  },
  {
    id: 'dining-out',
    categoryId: 'connection',
    title: 'Dining out',
    sub: 'shared a warm moment',
    navigate: null,
    tip: 'Shared meals combine connection, pleasure, and routine — all protective for mood. Presence beats perfection.',
    emoPrompt: 'Dining out lifted my mood — help me notice what made it feel good',
  },
  {
    id: 'quality-time',
    categoryId: 'connection',
    title: 'Quality time with someone',
    sub: 'felt belonging',
    navigate: null,
    tip: 'Undivided attention — even 20 minutes — tells your nervous system you are not alone.',
  },
  {
    id: 'watching-movie',
    categoryId: 'rest',
    title: 'Watching a movie',
    sub: 'allowed rest',
    navigate: null,
    tip: 'Intentional rest is not laziness. A film can be a healthy container to feel, laugh, or unplug.',
    emoPrompt: 'Help me plan guilt-free rest — like a movie night when I need to recharge',
  },
  {
    id: 'music',
    categoryId: 'rest',
    title: 'Music you love',
    sub: 'shifted your mood',
    navigate: null,
    tip: 'Familiar songs can regulate emotion quickly. Create a “calm” or “uplift” playlist for hard hours.',
  },
  {
    id: 'nature-time',
    categoryId: 'rest',
    title: 'Time in nature',
    sub: 'felt grounded',
    navigate: null,
    tip: 'Green space and natural light support attention recovery. A window, park, or plants all count.',
  },
  {
    id: 'reading',
    categoryId: 'rest',
    title: 'Reading',
    sub: 'quiet mind escape',
    navigate: null,
    tip: 'Losing yourself in a book gives your mind a gentle pause from rumination.',
  },
  {
    id: 'good-sleep',
    categoryId: 'care',
    title: 'Protecting sleep',
    sub: 'woke more rested',
    navigate: null,
    tip: 'Sleep hygiene — dim light, cool room, consistent time — is one of the strongest mood stabilizers.',
  },
  {
    id: 'morning-routine',
    categoryId: 'care',
    title: 'Morning routine',
    sub: 'started steady',
    navigate: 'checkin',
    tip: 'A small predictable start (water, light, one minute of breath) reduces decision fatigue all day.',
  },
  {
    id: 'hydration-meals',
    categoryId: 'care',
    title: 'Regular meals & water',
    sub: 'energy felt steadier',
    navigate: null,
    tip: 'Blood sugar dips mimic anxiety. Gentle nutrition is emotional first aid, not discipline.',
  },
  {
    id: 'haircut-grooming',
    categoryId: 'care',
    title: 'Haircut or grooming',
    sub: 'felt refreshed',
    navigate: null,
    tip: 'Personal grooming can restore dignity and calm — a small act of self-care, not vanity.',
    emoPrompt: 'Getting a haircut helped me feel better — help me notice what that reset meant',
  },
];

const CATALOG_BY_ID = Object.fromEntries(HELPED_CATALOG.map((item) => [item.id, item]));

function parseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function getWeekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().slice(0, 10);
}

export function getCatalogItem(catalogId) {
  return CATALOG_BY_ID[catalogId] || null;
}

export function catalogItemToRow(item) {
  const cat = HELPED_CATEGORIES[item.categoryId];
  return {
    id: item.id,
    catalogId: item.id,
    title: item.title,
    sub: item.sub,
    color: cat?.accent || '#9B7BFF',
    categoryId: item.categoryId,
    categoryLabel: cat?.label || 'Self-care',
    navigate: item.navigate,
    tip: item.tip,
    emoPrompt: item.emoPrompt || null,
    custom: false,
  };
}

/** @returns {Promise<Array<object>>} */
export async function loadUserHelpedLog() {
  return parseJson(await AsyncStorage.getItem(HELPED_STORAGE_KEY), []);
}

/** @returns {Promise<Array<object>>} */
export async function loadUserHelpedThisWeek(weekKey = getWeekKey()) {
  const all = await loadUserHelpedLog();
  return all.filter((e) => e.weekKey === weekKey);
}

/**
 * @param {{ catalogId?: string; title?: string; categoryId: string; sub?: string }} input
 */
export async function addHelpedActivity(input) {
  const categoryId = input.categoryId;
  if (!HELPED_CATEGORIES[categoryId]) return null;

  let row;
  if (input.catalogId && CATALOG_BY_ID[input.catalogId]) {
    row = catalogItemToRow(CATALOG_BY_ID[input.catalogId]);
    row.recordId = `log-${Date.now()}`;
  } else {
    const trimmed = input.title?.trim();
    if (!trimmed) return null;
    const cat = HELPED_CATEGORIES[categoryId];
    row = {
      id: `custom-${Date.now()}`,
      recordId: `log-${Date.now()}`,
      catalogId: null,
      title: trimmed,
      sub: input.sub?.trim() || 'something that helped you',
      color: cat.accent,
      categoryId,
      categoryLabel: cat.label,
      navigate: null,
      tip: `You noticed that “${trimmed}” supported you this week. Repeating small wins builds emotional confidence — not perfection.`,
      emoPrompt: `I noticed that "${trimmed}" helped me this week. Can we explore what made it meaningful?`,
      custom: true,
    };
  }

  row.weekKey = getWeekKey();
  row.addedAt = new Date().toISOString();

  const all = await loadUserHelpedLog();
  const exists = row.catalogId
    ? all.some((e) => e.weekKey === row.weekKey && e.catalogId === row.catalogId)
    : false;
  if (!exists) {
    all.unshift(row);
    await AsyncStorage.setItem(HELPED_STORAGE_KEY, JSON.stringify(all.slice(0, 80)));
  }
  return row;
}

export async function removeHelpedRecord(recordId) {
  const all = await loadUserHelpedLog();
  const next = all.filter((e) => e.recordId !== recordId);
  await AsyncStorage.setItem(HELPED_STORAGE_KEY, JSON.stringify(next));
}

/** @param {{ title?: string; sub?: string; categoryId?: string }} patch */
export async function updateHelpedRecord(recordId, patch) {
  const all = await loadUserHelpedLog();
  const idx = all.findIndex((e) => e.recordId === recordId);
  if (idx < 0) return null;

  const existing = all[idx];
  const categoryId = patch.categoryId && HELPED_CATEGORIES[patch.categoryId] ? patch.categoryId : existing.categoryId;
  const cat = HELPED_CATEGORIES[categoryId];
  const next = {
    ...existing,
    categoryId,
    categoryLabel: cat?.label || existing.categoryLabel,
    color: cat?.accent || existing.color,
  };

  if (typeof patch.title === 'string' && patch.title.trim()) {
    next.title = patch.title.trim();
  }
  if (typeof patch.sub === 'string') {
    next.sub = patch.sub.trim() || existing.sub;
  }

  all[idx] = next;
  await AsyncStorage.setItem(HELPED_STORAGE_KEY, JSON.stringify(all));
  return next;
}

/**
 * Edit a user log, or personalize an inferred catalog suggestion (saves as your log).
 * @param {{ recordId?: string; catalogId?: string | null; inferred?: boolean; categoryId?: string; title?: string; sub?: string }} item
 * @param {{ title?: string; sub?: string }} patch
 */
export async function editHelpedItem(item, patch) {
  if (item?.recordId) {
    return updateHelpedRecord(item.recordId, patch);
  }

  const catalogId = item?.catalogId;
  if (!catalogId || !CATALOG_BY_ID[catalogId]) return null;

  await dismissHelpedSuggestion(catalogId);

  const base = catalogItemToRow(CATALOG_BY_ID[catalogId]);
  const row = {
    ...base,
    recordId: `log-${Date.now()}`,
    title: patch.title?.trim() || base.title,
    sub: typeof patch.sub === 'string' ? patch.sub.trim() || base.sub : base.sub,
    inferred: false,
    userLogged: true,
    weekKey: getWeekKey(),
    addedAt: new Date().toISOString(),
  };

  const all = await loadUserHelpedLog();
  all.unshift(row);
  await AsyncStorage.setItem(HELPED_STORAGE_KEY, JSON.stringify(all.slice(0, 80)));
  return row;
}

async function loadDismissedSuggestions() {
  return parseJson(await AsyncStorage.getItem(HELPED_DISMISSED_KEY), []);
}

/** Hide an inferred catalog suggestion for a given week. */
export async function dismissHelpedSuggestion(catalogId, weekKey = getWeekKey()) {
  if (!catalogId) return;
  const dismissed = await loadDismissedSuggestions();
  const key = `${weekKey}:${catalogId}`;
  if (dismissed.includes(key)) return;
  dismissed.unshift(key);
  await AsyncStorage.setItem(HELPED_DISMISSED_KEY, JSON.stringify(dismissed.slice(0, 120)));
}

/** Remove a user log or dismiss an inferred suggestion. */
export async function removeHelpedItem(item) {
  if (item?.recordId) {
    await removeHelpedRecord(item.recordId);
    return;
  }
  if (item?.catalogId) {
    await dismissHelpedSuggestion(item.catalogId);
  }
}

function inferCatalogIds(moodVectors, journalCount) {
  const labels = moodVectors.map((v) => v.moodLabel);
  const ids = new Set();

  if (labels.some((l) => ['Peaceful', 'Light', 'Grateful'].includes(l))) {
    ids.add('evening-walk');
  }
  if (journalCount > 0) {
    ids.add('journaling');
  }
  if (labels.some((l) => ['Anxious', 'Overwhelmed', 'Heavy'].includes(l))) {
    ids.add('deep-breathing');
  }
  if (labels.includes('Tired')) {
    ids.add('good-sleep');
  }
  if (labels.includes('Hopeful') || labels.includes('Grateful')) {
    ids.add('quality-time');
  }

  if (!ids.size) {
    ['evening-walk', 'journaling', 'deep-breathing'].forEach((id) => ids.add(id));
  }

  return [...ids].slice(0, 5);
}

/**
 * Merge user-logged + inferred catalog items for Insights UI.
 */
export async function loadThingsThatHelped(moodVectors = [], journalCount = 0) {
  const userWeek = await loadUserHelpedThisWeek();
  const inferredIds = inferCatalogIds(moodVectors, journalCount);
  const dismissed = new Set(await loadDismissedSuggestions());
  const weekKey = getWeekKey();

  const seen = new Set();
  const rows = [];

  for (const u of userWeek) {
    const key = u.catalogId || u.recordId;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({ ...u, userLogged: true });
  }

  for (const id of inferredIds) {
    if (seen.has(id)) continue;
    if (dismissed.has(`${weekKey}:${id}`)) continue;
    seen.add(id);
    rows.push({ ...catalogItemToRow(CATALOG_BY_ID[id]), inferred: true });
  }

  return rows.slice(0, 8);
}

export function getCatalogByCategory(categoryId) {
  return HELPED_CATALOG.filter((item) => item.categoryId === categoryId);
}
