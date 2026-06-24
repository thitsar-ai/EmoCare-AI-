import AsyncStorage from '@react-native-async-storage/async-storage';
import { aggregateWeeklyEmoData } from './emoAnalytics';
import { loadThingsThatHelped } from './thingsThatHelped';

const THEME_COLORS = {
  Overwhelmed: '#6B7FD7',
  Peaceful: '#3DBDA8',
  Grateful: '#E89B5C',
  Heavy: '#D46BA8',
  Anxious: '#9B7BFF',
  Light: '#B79DFF',
  Hopeful: '#7BC67E',
  Tired: '#A99CCF',
  Neutral: '#8E82B0',
};

const FALLBACK_THEMES = [
  { label: 'Overwhelmed', pct: 65, color: THEME_COLORS.Overwhelmed },
  { label: 'Peaceful', pct: 42, color: THEME_COLORS.Peaceful },
  { label: 'Grateful', pct: 42, color: THEME_COLORS.Grateful },
  { label: 'Heavy', pct: 28, color: THEME_COLORS.Heavy },
];

function countMoodThemes(moodVectors) {
  const counts = {};
  for (const v of moodVectors) {
    const label = v.moodLabel;
    if (!label) continue;
    counts[label] = (counts[label] || 0) + 1;
  }
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!total) return [];
  return Object.entries(counts)
    .map(([label, count]) => ({
      label,
      pct: Math.round((count / total) * 100),
      color: THEME_COLORS[label] || '#9B7BFF',
      emoji: moodVectors.find((v) => v.moodLabel === label)?.emoji || null,
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4);
}

/** Floating mood bubbles — labels only, no percentages. */
export function buildEmotionalWeather(moodVectors) {
  const counts = {};
  for (const v of moodVectors) {
    if (!v.moodLabel) continue;
    counts[v.moodLabel] = (counts[v.moodLabel] || 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label]) => ({
      label,
      color: THEME_COLORS[label] || '#9B7BFF',
      emoji: moodVectors.find((v) => v.moodLabel === label)?.emoji || null,
    }));
}

const POSITIVE_MOODS = new Set(['Peaceful', 'Grateful', 'Light', 'Hopeful']);

function moodCounts(moodVectors) {
  const counts = {};
  for (const v of moodVectors) {
    if (v.moodLabel) counts[v.moodLabel] = (counts[v.moodLabel] || 0) + 1;
  }
  return counts;
}

/** Hero observation for Insights — warm, observational, non-clinical. */
export function buildInsightsHeroInsight(moodVectors, journalCount) {
  const counts = moodCounts(moodVectors);
  const labels = Object.keys(counts);
  const hasHeavy = labels.some((l) => ['Overwhelmed', 'Heavy', 'Anxious'].includes(l));
  const hasGrateful = (counts.Grateful || 0) >= 1;
  const hasPeaceful = (counts.Peaceful || 0) >= 1;

  if (!labels.length && !journalCount) {
    return "When you're ready, I'll reflect your week back to you — gently, without judgment.";
  }
  if (hasGrateful && hasHeavy) {
    return 'Gratitude has appeared frequently, even on challenging days.';
  }
  if ((counts.Peaceful || 0) >= 2) {
    return 'Peaceful moments appeared more often this week.';
  }
  if (hasPeaceful && hasHeavy) {
    return 'Even on heavier days, you found moments of peace.';
  }
  if (hasGrateful) {
    return 'Gratitude has been a quiet thread through your week.';
  }
  if (moodVectors.length >= 2) {
    return "You've continued showing up for yourself.";
  }
  if (journalCount >= 1) {
    return 'Your journal entries this week show thoughtful reflection.';
  }
  return "You're building a relationship with your inner world — one honest moment at a time.";
}

/** Supportive growth lines — no streaks or gamification. */
export function buildGentleGrowth(moodVectors, journalCount) {
  const checkInCount = moodVectors.length;
  if (checkInCount === 0 && journalCount === 0) {
    return {
      line1: 'Your reflection space is ready when you are.',
      line2: 'Showing up even once begins a kinder relationship with yourself.',
    };
  }

  let line1 =
    checkInCount === 1
      ? 'You checked in once this week.'
      : `You checked in ${checkInCount} times this week.`;

  let line2 = "You're building a stronger relationship with yourself.";

  if (journalCount >= 2 && checkInCount >= 2) {
    line2 = 'Your check-ins and journal notes are weaving a clearer self-understanding.';
  } else if (journalCount >= 1) {
    line2 = 'Writing and checking in — both are acts of care.';
  } else if (checkInCount >= 3) {
    line2 = "You're learning to listen to yourself with more kindness.";
  }

  return { line1, line2 };
}

/** Emo's weekly reflection — compassionate, never clinical. */
export function buildEmoReflection(moodVectors, journalCount) {
  const counts = moodCounts(moodVectors);
  const labels = Object.keys(counts);
  const hasHeavy = labels.some((l) => ['Overwhelmed', 'Heavy', 'Anxious'].includes(l));
  const hasGrateful = (counts.Grateful || 0) >= 1;
  const hasPeaceful = (counts.Peaceful || 0) >= 1;
  const hasHopeful = (counts.Hopeful || 0) >= 1;

  if (!labels.length && !journalCount) {
    return "I'm here whenever you'd like to explore your week together — no rush, no pressure.";
  }

  if (hasGrateful && hasHeavy) {
    return 'One thing I noticed this week: gratitude appeared even on difficult days. That says something beautiful about your resilience.';
  }
  if (hasPeaceful && hasHeavy) {
    return 'One thing I noticed this week: you still found pockets of peace, even when things felt heavy. That matters more than you know.';
  }
  if ((counts.Peaceful || 0) >= 2) {
    return 'One thing I noticed this week: calm kept finding its way back to you. Stillness is becoming familiar.';
  }
  if (hasHopeful) {
    return 'One thing I noticed this week: hope showed up in your check-ins. That forward whisper is worth honoring.';
  }
  if (journalCount >= 2) {
    return 'One thing I noticed this week: you took time to put feelings into words. That kind of honesty is quietly brave.';
  }
  if (moodVectors.length >= 2) {
    return 'One thing I noticed this week: you kept returning to yourself — not perfectly, but genuinely.';
  }
  return 'One thing I noticed this week: you paused long enough to ask how you really feel. That is never small.';
}

/** Activity titles for "What Helped" — from logs + gentle inference. */
export function buildWhatHelpedTitles(helpedRows, moodVectors, journalCount) {
  const titles = helpedRows.map((r) => r.title).filter(Boolean);
  const seen = new Set(titles.map((t) => t.toLowerCase()));

  const maybeAdd = (title) => {
    if (!seen.has(title.toLowerCase())) {
      seen.add(title.toLowerCase());
      titles.push(title);
    }
  };

  if (journalCount > 0) maybeAdd('Journaling');
  if (moodVectors.some((v) => POSITIVE_MOODS.has(v.moodLabel))) {
    maybeAdd('Evening walks');
  }
  if (moodVectors.some((v) => ['Anxious', 'Overwhelmed'].includes(v.moodLabel))) {
    maybeAdd('Breathing');
  }

  return titles.slice(0, 6);
}

const MOOD_OBSERVATIONS = {
  Peaceful:
    'Stillness has been visiting you lately. However brief, those peaceful moments are real — and they\'re yours.',
  Grateful:
    'Gratitude keeps surfacing in your week. Noticing what\'s good doesn\'t erase what\'s hard; it holds room for both.',
  Light:
    'Something lighter has been peeking through. You don\'t have to force joy — letting it arrive gently is enough.',
  Hopeful:
    'Hope keeps finding its way into your check-ins. That quiet forward whisper matters, even on quieter days.',
  Neutral:
    'You\'ve been steady this week — neither high nor low. There\'s wisdom in showing up without needing a big story.',
  Tired:
    'You\'ve been carrying tiredness. Rest isn\'t giving up; it\'s how you replenish enough to keep going.',
  Heavy:
    'This week held some weight. You didn\'t have to carry it all in your head — and you still showed up.',
  Anxious:
    'Anxiety has been close lately. Naming it is already a kind of exhale — you don\'t have to solve it all at once.',
  Overwhelmed:
    'Things have felt like a lot. Even pausing to check in is proof you\'re still listening to yourself.',
};

function isRecent(isoDate, maxDays = 2) {
  if (!isoDate) return false;
  const then = new Date(isoDate).getTime();
  const now = Date.now();
  return now - then <= maxDays * 24 * 60 * 60 * 1000;
}

export function buildGentleInsight(moodVectors, journalCount) {
  const labels = moodVectors.map((v) => v.moodLabel).filter(Boolean);
  const latest = moodVectors.length ? moodVectors[moodVectors.length - 1] : null;
  const hasPeaceful =
    labels.includes('Peaceful') || labels.includes('Grateful') || labels.includes('Light');
  const hasHeavy =
    labels.includes('Overwhelmed') || labels.includes('Heavy') || labels.includes('Anxious');

  if (!labels.length && !journalCount) {
    return 'Every feeling you name is a small act of care. When you\'re ready, a check-in or journal note helps Emo walk beside you.';
  }

  if (latest?.moodLabel && isRecent(latest.date) && MOOD_OBSERVATIONS[latest.moodLabel]) {
    return MOOD_OBSERVATIONS[latest.moodLabel];
  }

  if (hasHeavy && hasPeaceful) {
    return 'You navigated a lot this week, but also found moments of peace. You are growing stronger in ways you might not see yet.';
  }
  if (hasHeavy) {
    return 'This week held some weight — and you still showed up. That steadiness matters, even when progress feels invisible.';
  }
  if (journalCount >= 2) {
    return 'Your journal entries this week show thoughtful reflection. Naming feelings is a quiet kind of courage.';
  }
  if (labels.length >= 3) {
    return 'Small check-ins are building a clearer picture of your emotional rhythm — gently, on your terms.';
  }
  if (latest?.moodLabel && MOOD_OBSERVATIONS[latest.moodLabel]) {
    return MOOD_OBSERVATIONS[latest.moodLabel];
  }
  return 'You\'re building a relationship with your inner world — one honest moment at a time.';
}

/** One warm observation from on-device check-ins and journal activity. */
export async function loadGentleInsight(days = 7) {
  const data = await aggregateWeeklyEmoData(days);
  return {
    insight: buildGentleInsight(data.moodVectors, data.journalExcerpts.length),
    hasLiveData: data.moodVectors.length > 0 || data.journalExcerpts.length > 0,
  };
}

export async function loadInsightsBundle(days = 7) {
  const data = await aggregateWeeklyEmoData(days);
  const themes = countMoodThemes(data.moodVectors);
  const gentleInsight = buildGentleInsight(data.moodVectors, data.journalExcerpts.length);
  const helped = await loadThingsThatHelped(data.moodVectors, data.journalExcerpts.length);
  const journalCount = data.journalExcerpts.length;

  return {
    weekLabel: data.weekRange.label,
    themes: themes.length ? themes : [],
    gentleInsight,
    heroInsight: buildInsightsHeroInsight(data.moodVectors, journalCount),
    emotionalWeather: buildEmotionalWeather(data.moodVectors),
    gentleGrowth: buildGentleGrowth(data.moodVectors, journalCount),
    emoReflection: buildEmoReflection(data.moodVectors, journalCount),
    whatHelpedTitles: buildWhatHelpedTitles(helped, data.moodVectors, journalCount),
    helped,
    hasLiveData: data.moodVectors.length > 0 || journalCount > 0,
  };
}

export async function loadLatestMoodLabel() {
  const checkIn = await loadLatestCheckIn();
  return checkIn?.label ?? null;
}

/** Most recent check-in for Talk continuity. */
export async function loadLatestCheckIn() {
  try {
    const raw = await AsyncStorage.getItem('checkIns');
    if (!raw) return null;
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows) || !rows.length) return null;
    const sorted = [...rows].sort((a, b) => new Date(b.date) - new Date(a.date));
    const latest = sorted[0];
    if (!latest?.date) return null;
    return {
      label: latest?.mood?.label || null,
      emoji: latest?.mood?.emoji || null,
      date: latest.date,
      relativeTime: formatCheckInRelativeTime(latest.date),
    };
  } catch {
    return null;
  }
}

/** @param {string} isoDate */
export function formatCheckInRelativeTime(isoDate) {
  if (!isoDate) return '';
  const then = new Date(isoDate).getTime();
  if (Number.isNaN(then)) return '';
  const diffMs = Date.now() - then;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(isoDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
