import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatTimezoneLabel } from './settingsStorage';
import { INITIAL_CHECKIN_PAYLOAD_KEY } from './onboardingLanding';
import { JOURNAL_ENTRIES_KEY, PENDING_JOURNAL_CONTEXT_KEY } from './journalStorage';
import { loadOracleSavedInsights, ORACLE_SAVED_INSIGHTS_KEY } from './oracleSavedInsights';

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
  'ctx-onboarding': {
    detail: 'Something you shared when you first began with EmoCare.',
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
  const [checkInsRaw, journalRaw, onboarded, onboardingPayloadRaw] = await Promise.all([
    AsyncStorage.getItem('checkIns'),
    AsyncStorage.getItem('journalEntries'),
    AsyncStorage.getItem('onboarded'),
    AsyncStorage.getItem(INITIAL_CHECKIN_PAYLOAD_KEY),
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
    const onboardingNote = parseJson(onboardingPayloadRaw, '') || '';
    const trimmed = typeof onboardingNote === 'string' ? onboardingNote.trim() : '';
    if (trimmed.length >= 8) {
      items.push({
        id: 'ctx-onboarding',
        text: trimmed.length > 72 ? `${trimmed.slice(0, 69)}…` : trimmed,
        kind: 'context',
      });
    }
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

export const MEMORY_CATEGORIES = [
  { id: 'growth', icon: '🌱', label: 'Growth' },
  { id: 'relationships', icon: '💜', label: 'Relationships' },
  { id: 'reflection', icon: '🌙', label: 'Reflection' },
  { id: 'gratitude', icon: '✨', label: 'Gratitude' },
  { id: 'challenges', icon: '🌊', label: 'Challenges' },
  { id: 'milestones', icon: '🏆', label: 'Milestones' },
];

const MOOD_EMOJI = {
  Peaceful: '😌',
  Grateful: '✨',
  Hopeful: '🌱',
  Light: '☀️',
  Heavy: '🌧',
  Overwhelmed: '🌊',
  Anxious: '💭',
  Tired: '🌙',
  Neutral: '💜',
};

function moodEmoji(label) {
  return MOOD_EMOJI[label] || '💜';
}

function formatMonthKey(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return 'Earlier';
  }
}

function formatDayLabel(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  } catch {
    return '';
  }
}

function truncateQuote(text, max = 88) {
  const trimmed = String(text || '').trim().replace(/\s+/g, ' ');
  if (!trimmed) return '';
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}

function inferCategory({ moodLabel, text = '', kind }) {
  const lower = text.toLowerCase();
  if (kind === 'milestone') return 'milestones';
  if (moodLabel === 'Grateful' || /grateful|gratitude|thank/i.test(lower)) return 'gratitude';
  if (moodLabel === 'Hopeful' || /growth|progress|step|learning/i.test(lower)) return 'growth';
  if (/friend|family|partner|relationship|love|people|mom|dad|talked to/i.test(lower)) return 'relationships';
  if (['Overwhelmed', 'Heavy', 'Anxious'].includes(moodLabel) || /hard|difficult|stress|overwhelm/i.test(lower)) {
    return 'challenges';
  }
  if (kind === 'journal' || kind === 'reflection' || kind === 'checkin') return 'reflection';
  return 'reflection';
}

async function loadTimelineSources() {
  const [checkInsRaw, journalRaw, chatCurrentRaw, chatSavedRaw, oracleInsights] = await Promise.all([
    AsyncStorage.getItem('checkIns'),
    AsyncStorage.getItem('journalEntries'),
    AsyncStorage.getItem('chatCurrent'),
    AsyncStorage.getItem('chatSaved'),
    loadOracleSavedInsights(),
  ]);

  return {
    checkIns: parseJson(checkInsRaw, []),
    journalEntries: parseJson(journalRaw, []),
    chatCurrent: parseJson(chatCurrentRaw, []),
    chatSaved: parseJson(chatSavedRaw, []),
    oracleInsights: oracleInsights || [],
  };
}

function countConversations(chatCurrent, chatSaved) {
  let count = 0;
  if (Array.isArray(chatCurrent)) {
    count += chatCurrent.filter((m) => m.role === 'user' && m.text?.trim()).length;
  }
  if (Array.isArray(chatSaved)) {
    for (const thread of chatSaved) {
      const msgs = thread?.messages || [];
      count += msgs.filter((m) => m.role === 'user' && m.text?.trim()).length;
    }
  }
  return count;
}

/** Build chronological memory timeline items. */
export function buildMemoryTimeline(checkIns, journalEntries, milestones, oracleInsights, context) {
  const items = [];

  for (const entry of journalEntries) {
    if (!entry?.date) continue;
    const moodLabel = entry.mood?.label || '';
    const quote = truncateQuote(entry.text);
    if (!quote) continue;
    items.push({
      id: `journal-${entry.id || entry.date}`,
      date: entry.date,
      dayLabel: formatDayLabel(entry.date),
      monthKey: formatMonthKey(entry.date),
      moodLabel: moodLabel || 'Reflection',
      emoji: entry.mood?.emoji || moodEmoji(moodLabel) || '📝',
      quote,
      category: inferCategory({ moodLabel, text: quote, kind: 'journal' }),
      kind: 'journal',
      title: 'Journal reflection',
    });
  }

  for (const checkIn of checkIns) {
    if (!checkIn?.date) continue;
    const moodLabel = checkIn.mood?.label || 'Check-in';
    const quote =
      truncateQuote(checkIn.note) ||
      `You checked in feeling ${moodLabel.toLowerCase()}.`;
    items.push({
      id: `checkin-${checkIn.date}-${checkIn.id || moodLabel}`,
      date: checkIn.date,
      dayLabel: formatDayLabel(checkIn.date),
      monthKey: formatMonthKey(checkIn.date),
      moodLabel,
      emoji: checkIn.mood?.emoji || moodEmoji(moodLabel),
      quote,
      category: inferCategory({ moodLabel, text: quote, kind: 'checkin' }),
      kind: 'checkin',
      title: 'Check-in',
    });
  }

  for (const ms of milestones) {
    items.push({
      id: ms.id,
      date: new Date().toISOString(),
      dayLabel: formatDayLabel(new Date().toISOString()),
      monthKey: formatMonthKey(new Date().toISOString()),
      moodLabel: 'Milestone',
      emoji: '🏆',
      quote: ms.text,
      category: 'milestones',
      kind: 'milestone',
      title: 'Milestone',
      sourceItem: ms,
    });
  }

  for (const insight of oracleInsights) {
    if (!insight?.date) continue;
    items.push({
      id: insight.id || `oracle-${insight.date}`,
      date: insight.date,
      dayLabel: formatDayLabel(insight.date),
      monthKey: formatMonthKey(insight.date),
      moodLabel: 'Insight',
      emoji: '✨',
      quote: truncateQuote(insight.insight || insight.query),
      category: 'growth',
      kind: 'insight',
      title: 'Saved insight',
    });
  }

  for (const ctx of context) {
    if (ctx.id === 'ctx-empty') continue;
    items.push({
      id: ctx.id,
      date: new Date().toISOString(),
      dayLabel: formatDayLabel(new Date().toISOString()),
      monthKey: formatMonthKey(new Date().toISOString()),
      moodLabel: 'Context',
      emoji: '💜',
      quote: ctx.text,
      category: inferCategory({ text: ctx.text, kind: 'context' }),
      kind: 'context',
      title: 'Personal context',
      sourceItem: ctx,
    });
  }

  return items.sort((a, b) => new Date(b.date) - new Date(a.date));
}

/** Group timeline items by month label. */
export function groupTimelineByMonth(items) {
  const groups = [];
  const map = new Map();
  for (const item of items) {
    const key = item.monthKey || 'Earlier';
    if (!map.has(key)) {
      const group = { monthKey: key, items: [] };
      map.set(key, group);
      groups.push(group);
    }
    map.get(key).items.push(item);
  }
  return groups;
}

/** Pick a featured memory for the hero card. */
export function buildFeaturedMemory(timeline, checkIns) {
  if (!timeline.length) {
    return {
      dayLabel: '',
      moodLabel: '',
      emoji: '💜',
      quote: 'Your journey is just beginning — Emo will remember the moments that matter as you show up.',
      reason: 'Every first check-in and reflection becomes part of your story.',
    };
  }

  const journalOrNote = timeline.find((t) => t.kind === 'journal' || (t.kind === 'checkin' && t.quote.length > 28));
  const hopeful = timeline.find((t) => ['Hopeful', 'Grateful', 'Peaceful'].includes(t.moodLabel));
  const featured = journalOrNote || hopeful || timeline[0];

  const moodCounts = {};
  for (const c of checkIns) {
    const label = c.mood?.label;
    if (label) moodCounts[label] = (moodCounts[label] || 0) + 1;
  }
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const reason = topMood
    ? `Saved because ${topMood.toLowerCase()} has appeared often in your journey.`
    : 'Saved because this theme appeared often in your journey.';

  return {
    dayLabel: featured.dayLabel,
    moodLabel: featured.moodLabel,
    emoji: featured.emoji,
    quote: featured.quote.startsWith('"') ? featured.quote : `"${featured.quote}"`,
    reason,
    sourceItem: featured.sourceItem || featured,
  };
}

/** Supportive emotional pattern lines — personal, never clinical. */
export function buildEmotionalPatterns(checkIns, journalEntries) {
  const lines = [];
  const moodCounts = {};
  const hourCounts = { morning: 0, afternoon: 0, evening: 0, night: 0 };

  for (const c of checkIns) {
    const label = c.mood?.label;
    if (label) moodCounts[label] = (moodCounts[label] || 0) + 1;
    hourCounts[hourBucket(new Date(c.date).getHours())] += 1;
  }

  if (journalEntries.length >= 2) {
    lines.push('You often find peace through journaling.');
  } else if (journalEntries.length === 1) {
    lines.push('Writing has already become a quiet anchor for you.');
  }

  if ((moodCounts.Grateful || 0) >= 1) {
    lines.push('Gratitude appears frequently in your reflections.');
  }
  if ((moodCounts.Peaceful || 0) >= 2) {
    lines.push('Peaceful moments keep returning to your check-ins.');
  }
  if ((moodCounts.Hopeful || 0) >= 1) {
    lines.push('Hope shows up even on mixed days — that matters.');
  }

  const preferred = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  if (checkIns.length >= 3 && preferred === 'evening') {
    lines.push('You tend to feel calmer after evening check-ins.');
  } else if (checkIns.length >= 3 && preferred === 'morning') {
    lines.push('Morning check-ins help you begin the day with intention.');
  }

  const hasBreathJournal = journalEntries.some((e) => /breath|breathe|calm/i.test(e.text || ''));
  if (hasBreathJournal) {
    lines.push('Breathing and pause have been gentle allies for you.');
  }

  if (!lines.length) {
    lines.push('Emo is learning your rhythms — each check-in helps your story take shape.');
    lines.push('There is no rush. Meaningful patterns appear in their own time.');
  }

  return lines.slice(0, 4);
}

/** Weekly memory reflection — warm, narrative, never predictive. */
export function buildMemoryReflection(checkIns, journalEntries, patterns) {
  const recentCheckIns = [...checkIns]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 14);
  const recentJournal = [...journalEntries]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  if (!recentCheckIns.length && !recentJournal.length) {
    return "Looking back, your ledger is open and waiting. When you're ready, Emo will reflect the themes that emerge — gently, without judgment.";
  }

  const moodCounts = {};
  for (const c of recentCheckIns) {
    const label = c.mood?.label;
    if (label) moodCounts[label] = (moodCounts[label] || 0) + 1;
  }
  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  if (topMood === 'Grateful' && (moodCounts.Heavy || moodCounts.Overwhelmed)) {
    return 'Looking back, one thing stands out: gratitude kept finding you, even alongside harder days. That speaks to a quiet resilience Emo wants you to remember.';
  }
  if (topMood === 'Peaceful') {
    return 'Looking back, one thing stands out: calm has been visiting you more often. Those still moments are becoming part of who you are becoming.';
  }
  if (topMood === 'Hopeful') {
    return 'Looking back, one thing stands out: hope has threaded through your recent days — not loud, but steady. That forward whisper is worth honoring.';
  }
  if (recentJournal.length >= 2) {
    return 'Looking back, one thing stands out: you keep returning to put feelings into words. That honesty is a form of care Emo will always remember.';
  }
  if (patterns[0]) {
    return `Looking back, one thing stands out: ${patterns[0].replace(/\.$/, '').toLowerCase()}. Emo holds that as part of your story.`;
  }
  return 'Looking back, one thing stands out: you keep showing up for yourself — imperfectly, genuinely. That is the heart of this journey.';
}

function countCategoryItems(timeline) {
  const counts = {};
  for (const cat of MEMORY_CATEGORIES) counts[cat.id] = 0;
  for (const item of timeline) {
    if (counts[item.category] != null) counts[item.category] += 1;
  }
  return counts;
}

export async function loadMemoryLedgerBundle(userName) {
  const [page, stats, sources] = await Promise.all([
    loadMemoryLedgerPage(userName),
    loadMemoryStats(),
    loadTimelineSources(),
  ]);
  const context = page.context.map(enrichContextItem);
  const milestones = page.milestones.map(enrichMilestoneItem);
  const savedCount = context.filter((c) => c.erasable).length + milestones.length;

  const timeline = buildMemoryTimeline(
    sources.checkIns,
    sources.journalEntries,
    milestones,
    sources.oracleInsights,
    context,
  );
  const timelineByMonth = groupTimelineByMonth(timeline);
  const emotionalPatterns = buildEmotionalPatterns(sources.checkIns, sources.journalEntries);
  const memoryReflection = buildMemoryReflection(
    sources.checkIns,
    sources.journalEntries,
    emotionalPatterns,
  );
  const featuredMemory = buildFeaturedMemory(timeline, sources.checkIns);
  const categoryCounts = countCategoryItems(timeline);

  const emoRemembers = {
    reflectionsCount: stats.journalCount,
    conversationsCount: countConversations(sources.chatCurrent, sources.chatSaved),
    savedInsightsCount: sources.oracleInsights.length,
    meaningfulMemoriesCount: Math.max(
      savedCount,
      timeline.filter((t) => t.kind !== 'context').length,
    ),
  };

  return {
    context,
    milestones,
    stats,
    savedCount,
    memoryTypes: DEFAULT_MEMORY_ITEMS,
    emoRemembers,
    featuredMemory,
    emotionalPatterns,
    memoryReflection,
    timeline,
    timelineByMonth,
    categoryCounts,
    memoryCategories: MEMORY_CATEGORIES,
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

/** Clear Memory Ledger history — timeline sources + dismissed context/milestones. */
export async function clearAllMemoryItems() {
  await AsyncStorage.multiSet([
    [MEMORY_CONTEXT_KEY, JSON.stringify(['__all__'])],
    [MEMORY_MILESTONES_KEY, JSON.stringify(['__all__'])],
    ['checkIns', JSON.stringify([])],
    [JOURNAL_ENTRIES_KEY, JSON.stringify([])],
    [ORACLE_SAVED_INSIGHTS_KEY, JSON.stringify([])],
    ['chatCurrent', JSON.stringify([])],
    ['chatSaved', JSON.stringify([])],
  ]);
  await AsyncStorage.multiRemove([
    'oracleChatCurrent',
    'oracleTopicLog',
    PENDING_JOURNAL_CONTEXT_KEY,
  ]);
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
