import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatTimezoneLabel } from './settingsStorage';

export const MEMORY_LEDGER_KEY = 'emoMemoryLedger';
export const MEMORY_CONTEXT_KEY = 'emoMemoryContextItems';
export const MEMORY_MILESTONES_KEY = 'emoMemoryMilestones';

export const DEFAULT_MEMORY_ITEMS = [
  {
    id: 'name',
    label: 'Your name',
    summary: 'How Emo addresses you in conversation.',
    usage:
      'Emo uses your name to personalize greetings and replies. Keeping this helps conversations feel warm and direct — never performative.',
  },
  {
    id: 'checkin-mood',
    label: 'Latest check-in mood',
    summary: 'The feeling you most recently logged.',
    usage:
      'Emo gently factors your latest mood into tone and pacing — softer when you are heavy, brighter when you are light — without treating you like a diagnosis.',
  },
  {
    id: 'journal-themes',
    label: 'Journal themes',
    summary: 'Recurring topics from entries you choose to explore with Emo.',
    usage:
      'When you tap "Ask Emo about this" on a journal entry, Emo holds that context for the next Talk session so you do not have to repeat yourself.',
  },
  {
    id: 'conversation-context',
    label: 'Recent conversation context',
    summary: 'The current chat thread on this device.',
    usage:
      'Emo remembers what you have said in this session so replies stay coherent. Delete the conversation anytime from the Talk menu.',
  },
];

const CONTEXT_ITEM_META = {
  'ctx-pref-time': {
    detail: 'Emo notices when you tend to check in most often and can suggest gentle prompts at similar times.',
    usage: 'Used to time reminders and nudges without feeling intrusive.',
  },
  'ctx-work-pace': {
    detail: 'A pattern from your recent check-ins or notes about work stress.',
    usage: 'Emo may offer slower pacing and practical grounding when work feels heavy.',
  },
  'ctx-latest-mood': {
    detail: 'Your most recent mood label from Check-in.',
    usage: 'Shapes tone in Talk — validation first, never rushing you toward “fixing” a feeling.',
  },
  'ctx-breathing': {
    detail: 'Breathing or calm practices have helped you before when anxious.',
    usage: 'Emo may gently suggest Breathe when stress patterns appear — always optional.',
  },
  'ctx-name-tz': {
    detail: 'Your chosen name and local timezone for this device.',
    usage: 'Personalizes greetings and keeps time-aware suggestions accurate.',
  },
  'ctx-building': {
    detail: 'Context you shared during onboarding about what you are building or working on.',
    usage: 'Helps Emo stay relevant to your current chapter without making assumptions.',
  },
  'ctx-empty': {
    detail: 'Emo has not learned personal context yet — that is completely fine.',
    usage: 'Check in, journal, or talk with Emo and useful patterns will appear here over time.',
    erasable: false,
  },
};

const MILESTONE_META = {
  'ms-streak-7': {
    detail: 'You checked in seven days in a row — a meaningful rhythm of self-awareness.',
    usage: 'Milestones celebrate consistency, not perfection. They stay private on this device.',
  },
  'ms-streak': {
    detail: 'A streak of consecutive days with at least one check-in.',
    usage: 'Emo uses milestones to acknowledge progress — never to pressure you.',
  },
  'ms-journal-first': {
    detail: 'Your first saved journal entry — a small act of honesty with yourself.',
    usage: 'Journal context can flow into Talk when you choose to explore an entry with Emo.',
  },
  'ms-onboarding': {
    detail: 'You completed onboarding and chose to begin this journey.',
    usage: 'Marks the start of your private emotional record on this device.',
  },
};

function parseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function hourBucket(hour) {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function countCheckInStreak(checkIns) {
  if (!checkIns.length) return 0;
  const days = new Set(checkIns.map((c) => c.date?.slice(0, 10)).filter(Boolean));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  while (true) {
    const key = cursor.toISOString().slice(0, 10);
    if (days.has(key)) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    } else {
      break;
    }
  }
  return streak;
}

export async function buildPersonalContextItems(userName) {
  const [checkInsRaw, journalRaw, onboarded] = await Promise.all([
    AsyncStorage.getItem('checkIns'),
    AsyncStorage.getItem('journalEntries'),
    AsyncStorage.getItem('onboarded'),
  ]);
  const checkIns = parseJson(checkInsRaw, []);
  const journalEntries = parseJson(journalRaw, []);
  const items = [];

  const hourCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  for (const c of checkIns) {
    const h = new Date(c.date).getHours();
    hourCounts[hourBucket(h)] += 1;
  }
  const preferred =
    Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'evening';
  if (checkIns.length >= 2) {
    items.push({
      id: 'ctx-pref-time',
      text: `Prefers ${preferred}s for reflection`,
      kind: 'context',
    });
  }

  const sorted = [...checkIns].sort((a, b) => new Date(b.date) - new Date(a.date));
  const latest = sorted[0];
  if (latest?.mood?.label === 'Overwhelmed' || latest?.note?.toLowerCase().includes('work')) {
    items.push({
      id: 'ctx-work-pace',
      text: 'Feeling overwhelmed about work pace',
      kind: 'context',
    });
  } else if (latest?.mood?.label) {
    items.push({
      id: 'ctx-latest-mood',
      text: `Recent mood: ${latest.mood.label}`,
      kind: 'context',
    });
  }

  const breatheMention = journalEntries.some(
    (e) =>
      /breath|breathing|breathe|anxious|anxiety/i.test(e.text || '') ||
      ['Anxious', 'Overwhelmed'].includes(latest?.mood?.label),
  );
  if (breatheMention || latest?.mood?.label === 'Anxious') {
    items.push({
      id: 'ctx-breathing',
      text: 'Deep breathing helps most when anxious',
      kind: 'context',
    });
  }

  const name = userName?.trim();
  if (name) {
    items.push({
      id: 'ctx-name-tz',
      text: `Name: ${name} · ${formatTimezoneLabel()}`,
      kind: 'context',
    });
  }

  if (onboarded === 'true') {
    items.push({
      id: 'ctx-building',
      text: 'Building EmoCare emotional wellness app',
      kind: 'context',
    });
  }

  if (!items.length) {
    return [
      { id: 'ctx-empty', text: 'Emo will learn gentle context as you check in and journal.', kind: 'context' },
    ];
  }
  return items;
}

export async function buildMilestoneItems() {
  const [checkInsRaw, journalRaw, onboarded, dismissedRaw] = await Promise.all([
    AsyncStorage.getItem('checkIns'),
    AsyncStorage.getItem('journalEntries'),
    AsyncStorage.getItem('onboarded'),
    AsyncStorage.getItem(MEMORY_MILESTONES_KEY),
  ]);
  const dismissed = new Set(parseJson(dismissedRaw, []));
  const checkIns = parseJson(checkInsRaw, []);
  const journalEntries = parseJson(journalRaw, []);
  const milestones = [];

  const streak = countCheckInStreak(checkIns);
  if (streak >= 7) {
    const last = sortedCheckInDate(checkIns);
    milestones.push({
      id: 'ms-streak-7',
      text: `7-day check-in streak · ${formatShortDate(last)}`,
      color: '#3DBDA8',
      kind: 'milestone',
    });
  } else if (streak >= 3) {
    milestones.push({
      id: 'ms-streak',
      text: `${streak}-day check-in streak · ${formatShortDate(new Date().toISOString())}`,
      color: '#3DBDA8',
      kind: 'milestone',
    });
  }

  if (journalEntries.length > 0) {
    const first = [...journalEntries].sort((a, b) => new Date(a.date) - new Date(b.date))[0];
    milestones.push({
      id: 'ms-journal-first',
      text: 'First journal entry saved',
      color: '#9B7BFF',
      kind: 'milestone',
    });
  }

  if (onboarded === 'true') {
    milestones.push({
      id: 'ms-onboarding',
      text: 'Completed onboarding',
      color: '#E89B5C',
      kind: 'milestone',
    });
  }

  return milestones.filter((m) => !dismissed.has(m.id));
}

function enrichContextItem(item) {
  const meta = CONTEXT_ITEM_META[item.id] || {};
  return {
    ...item,
    kind: 'context',
    detail: meta.detail || 'Personal context inferred from your check-ins and journal on this device.',
    usage: meta.usage || 'Helps Emo respond with warmth and relevance — never shared or sold.',
    erasable: meta.erasable !== false && item.id !== 'ctx-empty',
  };
}

function enrichMilestoneItem(item) {
  const meta = MILESTONE_META[item.id] || {};
  return {
    ...item,
    kind: 'milestone',
    detail: meta.detail || 'A moment of progress Emo noticed in your emotional journey.',
    usage: meta.usage || 'Private celebration on this device. Dismiss anytime.',
    erasable: true,
  };
}

export async function loadMemoryStats() {
  const [checkInsRaw, journalRaw] = await Promise.all([
    AsyncStorage.getItem('checkIns'),
    AsyncStorage.getItem('journalEntries'),
  ]);
  const checkIns = parseJson(checkInsRaw, []);
  const journalEntries = parseJson(journalRaw, []);
  const streak = countCheckInStreak(checkIns);
  return {
    checkInCount: checkIns.length,
    journalCount: journalEntries.length,
    streak,
  };
}

export async function loadMemoryLedgerBundle(userName) {
  const [page, stats] = await Promise.all([loadMemoryLedgerPage(userName), loadMemoryStats()]);
  const context = page.context.map(enrichContextItem);
  const milestones = page.milestones.map(enrichMilestoneItem);
  const savedCount = context.filter((c) => c.erasable).length + milestones.length;

  return {
    context,
    milestones,
    stats,
    savedCount,
    memoryTypes: DEFAULT_MEMORY_ITEMS,
  };
}

function sortedCheckInDate(checkIns) {
  const sorted = [...checkIns].sort((a, b) => new Date(b.date) - new Date(a.date));
  return sorted[0]?.date || new Date().toISOString();
}

function formatShortDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export async function dismissMemoryItem(itemId) {
  const raw = await AsyncStorage.getItem(MEMORY_MILESTONES_KEY);
  const dismissed = parseJson(raw, []);
  if (!dismissed.includes(itemId)) {
    dismissed.push(itemId);
    await AsyncStorage.setItem(MEMORY_MILESTONES_KEY, JSON.stringify(dismissed));
  }
}

export async function dismissContextItem(itemId) {
  const raw = await AsyncStorage.getItem(MEMORY_CONTEXT_KEY);
  const dismissed = parseJson(raw, []);
  if (!dismissed.includes(itemId)) {
    dismissed.push(itemId);
    await AsyncStorage.setItem(MEMORY_CONTEXT_KEY, JSON.stringify(dismissed));
  }
}

export async function loadMemoryLedgerPage(userName) {
  const [dismissedMsRaw, dismissedCtxRaw] = await Promise.all([
    AsyncStorage.getItem(MEMORY_MILESTONES_KEY),
    AsyncStorage.getItem(MEMORY_CONTEXT_KEY),
  ]);
  const dismissedMs = parseJson(dismissedMsRaw, []);
  const dismissedCtx = parseJson(dismissedCtxRaw, []);

  if (dismissedMs.includes('__all__') && dismissedCtx.includes('__all__')) {
    return { context: [], milestones: [] };
  }

  const [contextAll, milestones] = await Promise.all([
    buildPersonalContextItems(userName),
    buildMilestoneItems(),
  ]);
  const dismissedCtxSet = new Set(dismissedCtx);
  const context = dismissedCtx.includes('__all__')
    ? []
    : contextAll.filter((c) => !dismissedCtxSet.has(c.id));
  const milestonesFiltered = dismissedMs.includes('__all__')
    ? []
    : milestones.filter((m) => !dismissedMs.includes(m.id));
  return { context, milestones: milestonesFiltered };
}

export async function clearAllMemoryItems() {
  await AsyncStorage.setItem(MEMORY_CONTEXT_KEY, JSON.stringify(['__all__']));
  await AsyncStorage.setItem(MEMORY_MILESTONES_KEY, JSON.stringify(['__all__']));
}

export async function loadMemoryLedger() {
  try {
    const raw = await AsyncStorage.getItem(MEMORY_LEDGER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_MEMORY_ITEMS.map((item) => ({ ...item, enabled: true }));
}

export async function saveMemoryLedger(items) {
  try {
    await AsyncStorage.setItem(MEMORY_LEDGER_KEY, JSON.stringify(items));
  } catch {}
}
