import AsyncStorage from '@react-native-async-storage/async-storage';

export const TODAY_TRIAGE_STORAGE_KEY = 'todayTriageTasks';
export const MORNING_BRIEFING_CACHE_KEY = 'morningBriefingCache';

/** Activity domains (behavioral activation + daily living — not raw energy buckets). */
export const ENERGY_CATEGORIES = {
  work: {
    id: 'work',
    label: 'Work & Focus',
    shortLabel: 'Work',
    description: 'Deep projects, study, and professional output',
    accent: '#6B7FD7',
    chipBg: 'rgba(107,127,215,0.18)',
  },
  home: {
    id: 'home',
    label: 'Home & Daily Life',
    shortLabel: 'Home',
    description: 'Cooking, chores, groceries, and home routines',
    accent: '#E89B5C',
    chipBg: 'rgba(232,155,92,0.18)',
  },
  movement: {
    id: 'movement',
    label: 'Body & Movement',
    shortLabel: 'Move',
    description: 'Walks, exercise, yoga, and physical care',
    accent: '#2A9D8F',
    chipBg: 'rgba(42,157,143,0.15)',
  },
  connect: {
    id: 'connect',
    label: 'Connection',
    shortLabel: 'Connect',
    description: 'People, calls, meals together, and belonging',
    accent: '#7BC67E',
    chipBg: 'rgba(123,198,126,0.18)',
  },
  care: {
    id: 'care',
    label: 'Rest & Self-Care',
    shortLabel: 'Care',
    description: 'Recovery, breath, journal, and gentle pause',
    accent: '#9B7BFF',
    chipBg: 'rgba(155,123,255,0.18)',
  },
  admin: {
    id: 'admin',
    label: 'Errands & Admin',
    shortLabel: 'Admin',
    description: 'Email, bills, appointments, and quick to-dos',
    accent: '#C4A35A',
    chipBg: 'rgba(196,163,90,0.18)',
  },
};

export const ENERGY_CATEGORY_ORDER = ['work', 'home', 'movement', 'connect', 'care', 'admin'];

const LEGACY_CATEGORY_MAP = {
  deep_focus: 'work',
  low_admin: 'admin',
  restorative: 'care',
};

/** Authoritative category for bundled demo tasks. */
const TASK_CATEGORY_BY_ID = {
  'seed-work-1': 'work',
  'seed-work-2': 'work',
  'seed-home-1': 'home',
  'seed-movement-1': 'movement',
  'seed-connect-1': 'connect',
  'seed-admin-1': 'admin',
  'seed-care-1': 'care',
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Match whole words/phrases — avoids "run" inside "errands", "call" inside "recall". */
function keywordMatches(text, keyword) {
  if (keyword.includes(' ')) {
    return text.includes(keyword);
  }
  return new RegExp(`\\b${escapeRegExp(keyword)}\\b`, 'i').test(text);
}

function scoreTaskCategory(title) {
  const text = title?.trim().toLowerCase() || '';
  const scores = Object.fromEntries(ENERGY_CATEGORY_ORDER.map((id) => [id, 0]));

  for (const [categoryId, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (keywordMatches(text, kw)) {
        scores[categoryId] += kw.length >= 6 ? 3 : kw.length >= 4 ? 2 : 1;
      }
    }
  }

  return scores;
}

function pickBestCategory(scores) {
  const maxScore = Math.max(...ENERGY_CATEGORY_ORDER.map((id) => scores[id]));
  if (maxScore <= 0) return 'home';

  const tied = ENERGY_CATEGORY_ORDER.filter((id) => scores[id] === maxScore);
  if (tied.length === 1) return tied[0];

  // Prefer the more specific domain when keywords tie (e.g. walk + lunch → movement).
  const tieBreak = ['movement', 'connect', 'care', 'work', 'admin', 'home'];
  for (const id of tieBreak) {
    if (tied.includes(id)) return id;
  }
  return tied[0];
}

/** @type {Record<string, string[]>} */
const CATEGORY_KEYWORDS = {
  work: [
    'work',
    'meeting',
    'project',
    'report',
    'proposal',
    'design',
    'code',
    'coding',
    'study',
    'homework',
    'presentation',
    'deadline',
    'investor',
    'write',
    'writing',
    'planning',
    'focus',
    'sprint',
    'review',
    'slide',
    'research',
    'essay',
    'exam',
  ],
  home: [
    'cook',
    'cooking',
    'meal',
    'dinner',
    'lunch',
    'breakfast',
    'bake',
    'baking',
    'kitchen',
    'clean',
    'cleaning',
    'laundry',
    'dishes',
    'vacuum',
    'grocery',
    'groceries',
    'shop',
    'shopping',
    'organize',
    'home',
    'meal prep',
    'tidy',
    'chores',
    'mop',
    'trash',
    'recycle',
    'feed',
    'pet',
  ],
  movement: [
    'walk',
    'walking',
    'gym',
    'run',
    'running',
    'yoga',
    'swim',
    'swimming',
    'stretch',
    'exercise',
    'workout',
    'bike',
    'cycling',
    'hike',
    'dance',
    'pilates',
    'steps',
  ],
  connect: [
    'call',
    'friend',
    'family',
    'mom',
    'dad',
    'parent',
    'coffee',
    'visit',
    'meet',
    'meeting friend',
    'lunch with',
    'coffee with',
    'dinner with',
    'text',
    'party',
    'social',
    'date',
    'partner',
    'child',
    'kids',
    'grandma',
    'grandpa',
    'catch up',
    'dining out',
  ],
  care: [
    'breathe',
    'breath',
    'breathing',
    'meditat',
    'rest',
    'nap',
    'sleep',
    'journal',
    'therapy',
    'relax',
    'movie',
    'read',
    'reading',
    'music',
    'self-care',
    'self care',
    'selfcare',
    'mindful',
    'bath',
    'unwind',
    'recharge',
    'pause',
    'haircut',
    'hair cut',
    'salon',
    'barber',
    'barbershop',
    'groom',
    'grooming',
    'manicure',
    'pedicure',
    'facial',
    'skincare',
    'skin care',
    'massage',
    'spa',
    'nails',
  ],
  admin: [
    'email',
    'emails',
    'reply',
    'bill',
    'pay',
    'payment',
    'appointment',
    'schedule',
    'errand',
    'errands',
    'bank',
    'tax',
    'form',
    'sign',
    'renew',
    'pick up',
    'drop off',
    'doctor',
    'dentist',
    'pharmacy',
    'insurance',
    'invoice',
  ],
};

const SEED_TASKS = [
  {
    id: 'seed-work-1',
    title: 'Review investor proposal',
    deadline: '9:00 AM',
    status: 'pending',
    energyCategory: 'work',
    durationMin: 45,
  },
  {
    id: 'seed-work-2',
    title: 'Design sprint planning',
    deadline: '10:30 AM',
    status: 'pending',
    energyCategory: 'work',
    durationMin: 30,
  },
  {
    id: 'seed-home-1',
    title: 'Meal prep for the week',
    deadline: 'flexible',
    status: 'pending',
    energyCategory: 'home',
    durationMin: 45,
  },
  {
    id: 'seed-movement-1',
    title: '30-min walk after lunch',
    deadline: '1:00 PM',
    status: 'pending',
    energyCategory: 'movement',
    durationMin: 30,
  },
  {
    id: 'seed-connect-1',
    title: 'Call Mom · catch up',
    deadline: '5:00 PM',
    status: 'pending',
    energyCategory: 'connect',
    durationMin: 20,
  },
  {
    id: 'seed-admin-1',
    title: 'Reply to 3 emails',
    deadline: 'flexible',
    status: 'done',
    energyCategory: 'admin',
    durationMin: 15,
  },
  {
    id: 'seed-care-1',
    title: '5-min breathing · 3:00 PM',
    deadline: '3:00 PM',
    status: 'pending',
    energyCategory: 'care',
    durationMin: 5,
    emoScheduled: true,
  },
];

function parseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function normalizeCategory(categoryId) {
  if (!categoryId) return 'home';
  return LEGACY_CATEGORY_MAP[categoryId] || categoryId;
}

/**
 * Infer activity category from task title (keyword scoring).
 * @returns {keyof typeof ENERGY_CATEGORIES}
 */
export function inferTaskCategory(title) {
  const text = title?.trim().toLowerCase() || '';
  if (!text) return 'home';
  return pickBestCategory(scoreTaskCategory(text));
}

/** Resolve the display + grouping category for a stored task. */
export function resolveTaskCategory(task) {
  if (!task) return 'home';

  if (task.id && TASK_CATEGORY_BY_ID[task.id]) {
    return TASK_CATEGORY_BY_ID[task.id];
  }

  const stored = normalizeCategory(task.energyCategory);
  if (task.categoryLocked) {
    return stored;
  }

  const inferred = inferTaskCategory(task.title || '');
  if (stored === 'home' && inferred !== 'home') {
    return inferred;
  }

  const scores = scoreTaskCategory(task.title || '');
  if (scores[inferred] >= 2 && scores[stored] < scores[inferred]) {
    return inferred;
  }

  if (scores[inferred] > 0 && scores[stored] > 0 && scores[inferred] === scores[stored]) {
    return pickBestCategory(scores);
  }

  return stored;
}

export function getTodayDayKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function withDayMeta(task, dayKey) {
  return {
    ...task,
    energyCategory: normalizeCategory(task.energyCategory),
    dayKey,
    createdAt: task.createdAt || new Date().toISOString(),
  };
}

async function migrateLegacyCategories(all) {
  let changed = false;
  const next = all.map((task) => {
    const resolved = resolveTaskCategory(task);
    if (resolved !== normalizeCategory(task.energyCategory)) {
      changed = true;
      return { ...task, energyCategory: resolved };
    }
    return task;
  });
  if (changed) {
    await AsyncStorage.setItem(TODAY_TRIAGE_STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

async function seedIfEmpty() {
  if (!__DEV__) return;
  const raw = await AsyncStorage.getItem(TODAY_TRIAGE_STORAGE_KEY);
  if (raw) return;
  const dayKey = getTodayDayKey();
  const seeded = SEED_TASKS.map((t) => withDayMeta(t, dayKey));
  await AsyncStorage.setItem(TODAY_TRIAGE_STORAGE_KEY, JSON.stringify(seeded));
}

async function ensureDevSeedTasks(all) {
  if (!__DEV__) return all;
  const dayKey = getTodayDayKey();
  const existingIds = new Set(all.filter((t) => t.dayKey === dayKey).map((t) => t.id));
  const missing = SEED_TASKS.filter((seed) => !existingIds.has(seed.id)).map((seed) =>
    withDayMeta(seed, dayKey),
  );
  if (!missing.length) return all;
  const next = [...all, ...missing];
  await AsyncStorage.setItem(TODAY_TRIAGE_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function loadAllTriageTasks() {
  await seedIfEmpty();
  let all = parseJson(await AsyncStorage.getItem(TODAY_TRIAGE_STORAGE_KEY), []);
  all = await migrateLegacyCategories(all);
  all = await ensureDevSeedTasks(all);
  if (!__DEV__) {
    const stripped = all.filter((t) => !String(t.id).startsWith('seed-'));
    if (stripped.length !== all.length) {
      all = stripped;
      await AsyncStorage.setItem(TODAY_TRIAGE_STORAGE_KEY, JSON.stringify(all));
    }
  }
  return all;
}

export async function loadTodayTasks(dayKey = getTodayDayKey()) {
  const all = await loadAllTriageTasks();
  return all.filter((t) => t.dayKey === dayKey);
}

export async function addTodayTask({ title, energyCategory, deadline = null, autoCategory = true }) {
  const trimmed = title?.trim();
  if (!trimmed) return null;
  const dayKey = getTodayDayKey();
  const resolvedCategory = autoCategory
    ? inferTaskCategory(trimmed)
    : normalizeCategory(energyCategory || inferTaskCategory(trimmed));

  const task = withDayMeta(
    {
      id: `task-${Date.now()}`,
      title: trimmed,
      deadline,
      status: 'pending',
      energyCategory: resolvedCategory,
      categoryLocked: !autoCategory,
    },
    dayKey,
  );
  const all = await loadAllTriageTasks();
  all.push(task);
  await AsyncStorage.setItem(TODAY_TRIAGE_STORAGE_KEY, JSON.stringify(all));
  return task;
}

export async function setTaskStatus(taskId, status) {
  const all = await loadAllTriageTasks();
  const idx = all.findIndex((t) => t.id === taskId);
  if (idx < 0) return null;
  all[idx] = { ...all[idx], status };
  await AsyncStorage.setItem(TODAY_TRIAGE_STORAGE_KEY, JSON.stringify(all));
  return all[idx];
}

export async function deleteTodayTask(taskId) {
  const all = await loadAllTriageTasks();
  const next = all.filter((t) => t.id !== taskId);
  if (next.length === all.length) return false;
  await AsyncStorage.setItem(TODAY_TRIAGE_STORAGE_KEY, JSON.stringify(next));
  return true;
}

export function groupTasksByEnergy(tasks) {
  return ENERGY_CATEGORY_ORDER.map((id) => ({
    category: ENERGY_CATEGORIES[id],
    tasks: tasks.filter((t) => resolveTaskCategory(t) === id),
  })).filter((g) => g.tasks.length > 0);
}

export function summarizeTodayTasks(tasks) {
  const pending = tasks.filter((t) => t.status !== 'done');
  const done = tasks.filter((t) => t.status === 'done');
  const byCategory = {};
  for (const id of ENERGY_CATEGORY_ORDER) {
    byCategory[id] = pending.filter((t) => resolveTaskCategory(t) === id).length;
  }

  return {
    total: tasks.length,
    pendingCount: pending.length,
    doneCount: done.length,
    byCategory,
    /** @deprecated use byCategory.work */
    deepFocusPending: byCategory.work,
    /** @deprecated use byCategory.admin */
    lowAdminPending: byCategory.admin,
    /** @deprecated use byCategory.care */
    restorativePending: byCategory.care,
    pendingTitles: pending.map((t) => ({
      title: t.title,
      energyCategory: resolveTaskCategory(t),
      deadline: t.deadline,
    })),
  };
}

export function formatBriefingContext(tasks, moodLabel, ambientProgress, userName) {
  const name = userName?.trim() || 'friend';
  const summary = summarizeTodayTasks(tasks);
  const moodPart = moodLabel ? `Mood: ${moodLabel}` : 'No check-in yet today';
  const ambientPart =
    typeof ambientProgress === 'number' ? ` · ambient ${ambientProgress.toFixed(2)}` : '';
  const categoryLine = ENERGY_CATEGORY_ORDER.filter((id) => summary.byCategory[id] > 0)
    .map((id) => `${summary.byCategory[id]} ${ENERGY_CATEGORIES[id].shortLabel.toLowerCase()}`)
    .join(' · ');
  const pendingLines = summary.pendingTitles.length
    ? summary.pendingTitles
        .map((t) => `- ${t.title} (${ENERGY_CATEGORIES[t.energyCategory]?.shortLabel || t.energyCategory})`)
        .join('\n')
    : '- No pending tasks';
  return `Morning briefing for ${name}\n${moodPart}${ambientPart}\n${categoryLine || 'No pending tasks by activity'}\n\nPending:\n${pendingLines}`;
}

export function buildEmoDailyNote(tasks, moodLabel) {
  const summary = summarizeTodayTasks(tasks);
  if (summary.byCategory.care > 0) {
    return 'You have self-care on the list — protect that pause like any other appointment.';
  }
  if (summary.byCategory.movement > 0) {
    return 'Movement is on your plate today. Even a short walk can shift your whole afternoon.';
  }
  if (summary.byCategory.work >= 2) {
    return 'A full work day ahead — start with one focus block before opening messages.';
  }
  if (summary.byCategory.home > 0) {
    return 'Home tasks count. Cooking or tidying can be grounding when you do them without rushing.';
  }
  if (moodLabel === 'Overwhelmed' || moodLabel === 'Heavy') {
    return 'Emo noticed a heavier mood — keep the list small and add one restful thing on purpose.';
  }
  return 'Pick one meaningful activity first — the rest of the day can orbit around that.';
}

export function categorySubline(task) {
  const id = resolveTaskCategory(task);
  const cat = ENERGY_CATEGORIES[id];
  const duration = task.durationMin || (id === 'admin' ? 15 : id === 'care' ? 10 : 30);
  const deadline = task.deadline || 'flexible';

  if (task.emoScheduled) {
    return `${cat.shortLabel} · Scheduled by Emo based on your rhythm`;
  }
  switch (id) {
    case 'work':
      return `${cat.shortLabel} · Focus · ${duration} min · ${deadline}`;
    case 'home':
      return `${cat.shortLabel} · Daily life · ${duration} min · ${deadline}`;
    case 'movement':
      return `${cat.shortLabel} · Body · ${duration} min · ${deadline}`;
    case 'connect':
      return `${cat.shortLabel} · Connection · ${deadline}`;
    case 'care':
      return `${cat.shortLabel} · Self-care · ${duration} min · ${deadline}`;
    case 'admin':
      return `${cat.shortLabel} · Quick task · ${duration} min · ${deadline}`;
    default:
      return `${cat?.shortLabel || 'Task'} · ${deadline}`;
  }
}

export function isBreathCareTask(task) {
  const id = resolveTaskCategory(task);
  if (id !== 'care') return false;
  return (
    task.emoScheduled ||
    /breath|breathe|meditat|mindful/i.test(task.title || '')
  );
}
