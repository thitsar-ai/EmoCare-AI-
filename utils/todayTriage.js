import AsyncStorage from '@react-native-async-storage/async-storage';

export const TODAY_TRIAGE_STORAGE_KEY = 'todayTriageTasks';
export const MORNING_BRIEFING_CACHE_KEY = 'emoMorningBriefing';

export const ENERGY_CATEGORIES = {
  deep_focus: {
    id: 'deep_focus',
    label: 'Deep Creative Focus',
    shortLabel: 'Deep Focus',
    description: 'High-compute cognitive work — strategy, design, coding sprints.',
    accent: '#6B4FA8',
    chipBg: 'rgba(107,79,168,0.14)',
  },
  low_admin: {
    id: 'low_admin',
    label: 'Low Energy Admin',
    shortLabel: 'Light Admin',
    description: 'Light execution — emails, scheduling, small clears.',
    accent: '#9B7FD4',
    chipBg: 'rgba(155,127,212,0.16)',
  },
  restorative: {
    id: 'restorative',
    label: 'Restorative Reflection',
    shortLabel: 'Restore',
    description: 'Grounding space — walks, reading, Breathe rituals.',
    accent: '#5DCAA5',
    chipBg: 'rgba(93,202,165,0.16)',
  },
};

export const ENERGY_CATEGORY_ORDER = ['deep_focus', 'low_admin', 'restorative'];

export function getTodayDayKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function parseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function normalizeTask(raw, dayKey = getTodayDayKey()) {
  if (!raw?.title?.trim()) return null;
  const category = ENERGY_CATEGORIES[raw.energyCategory]
    ? raw.energyCategory
    : 'low_admin';

  return {
    id: raw.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: raw.title.trim().slice(0, 140),
    deadline: raw.deadline || null,
    status: raw.status === 'done' ? 'done' : 'pending',
    energyCategory: category,
    dayKey: raw.dayKey || dayKey,
    createdAt: raw.createdAt || new Date().toISOString(),
  };
}

export async function loadAllTriageTasks() {
  const raw = await AsyncStorage.getItem(TODAY_TRIAGE_STORAGE_KEY);
  return parseJson(raw, []);
}

export async function loadTodayTasks(dayKey = getTodayDayKey()) {
  const all = await loadAllTriageTasks();
  return all
    .filter((task) => task.dayKey === dayKey)
    .map((task) => normalizeTask(task, dayKey))
    .filter(Boolean)
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
      return new Date(a.createdAt) - new Date(b.createdAt);
    });
}

async function persistTasks(allTasks) {
  await AsyncStorage.setItem(TODAY_TRIAGE_STORAGE_KEY, JSON.stringify(allTasks.slice(0, 120)));
}

export async function addTodayTask({ title, energyCategory, deadline = null }) {
  const dayKey = getTodayDayKey();
  const task = normalizeTask({ title, energyCategory, deadline, dayKey, status: 'pending' }, dayKey);
  if (!task) return null;

  const all = await loadAllTriageTasks();
  all.unshift(task);
  await persistTasks(all);
  return task;
}

export async function setTaskStatus(taskId, status) {
  const all = await loadAllTriageTasks();
  const idx = all.findIndex((t) => t.id === taskId);
  if (idx === -1) return null;

  all[idx] = { ...all[idx], status: status === 'done' ? 'done' : 'pending' };
  await persistTasks(all);
  return all[idx];
}

export function groupTasksByEnergy(tasks) {
  return ENERGY_CATEGORY_ORDER.map((categoryId) => ({
    category: ENERGY_CATEGORIES[categoryId],
    tasks: tasks.filter((t) => t.energyCategory === categoryId),
  })).filter((group) => group.tasks.length > 0);
}

export function summarizeTodayTasks(tasks) {
  const pending = tasks.filter((t) => t.status === 'pending');
  const done = tasks.filter((t) => t.status === 'done');
  const byEnergy = ENERGY_CATEGORY_ORDER.reduce((acc, key) => {
    acc[key] = pending.filter((t) => t.energyCategory === key).length;
    return acc;
  }, {});

  return {
    total: tasks.length,
    pendingCount: pending.length,
    doneCount: done.length,
    deepFocusPending: byEnergy.deep_focus,
    lowAdminPending: byEnergy.low_admin,
    restorativePending: byEnergy.restorative,
    pendingTitles: pending.map((t) => ({
      title: t.title,
      energyCategory: t.energyCategory,
      deadline: t.deadline,
    })),
  };
}

export function formatBriefingContext(tasks, moodLabel, ambientProgress, userName) {
  const summary = summarizeTodayTasks(tasks);
  const name = userName?.trim() || 'friend';

  const taskLines = summary.pendingTitles.length
    ? summary.pendingTitles.map((t) => `- [${ENERGY_CATEGORIES[t.energyCategory].shortLabel}] ${t.title}${t.deadline ? ` (by ${new Date(t.deadline).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })})` : ''}`).join('\n')
    : '- No pending intentions yet.';

  return `Morning briefing for ${name}
Check-in mood: ${moodLabel || 'not checked in yet'}
Ambient progress (0=radiant, 1=consoling): ${typeof ambientProgress === 'number' ? ambientProgress.toFixed(2) : 'unknown'}
Pending tasks: ${summary.pendingCount} · completed: ${summary.doneCount}
Deep focus pending: ${summary.deepFocusPending} · Light admin: ${summary.lowAdminPending} · Restorative: ${summary.restorativePending}

Today's agenda:
${taskLines}`;
}
