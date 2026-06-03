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
    }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 4);
}

function buildGentleInsight(moodVectors, journalCount) {
  const labels = moodVectors.map((v) => v.moodLabel).filter(Boolean);
  const hasPeaceful = labels.includes('Peaceful') || labels.includes('Grateful') || labels.includes('Light');
  const hasHeavy = labels.includes('Overwhelmed') || labels.includes('Heavy') || labels.includes('Anxious');

  if (!labels.length && !journalCount) {
    return 'You navigated a lot this week, but also found moments of peace. You are growing stronger in ways you might not see yet.';
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
  return 'Small check-ins are building a clearer picture of your emotional rhythm — gently, on your terms.';
}

export async function loadInsightsBundle(days = 7) {
  const data = await aggregateWeeklyEmoData(days);
  const themes = countMoodThemes(data.moodVectors);
  const gentleInsight = buildGentleInsight(data.moodVectors, data.journalExcerpts.length);
  const helped = await loadThingsThatHelped(data.moodVectors, data.journalExcerpts.length);

  return {
    weekLabel: data.weekRange.label,
    themes: themes.length ? themes : FALLBACK_THEMES,
    gentleInsight,
    helped,
    hasLiveData: data.moodVectors.length > 0 || data.journalExcerpts.length > 0,
  };
}

export async function loadLatestMoodLabel() {
  try {
    const raw = await AsyncStorage.getItem('checkIns');
    if (!raw) return null;
    const rows = JSON.parse(raw);
    if (!rows.length) return null;
    const sorted = [...rows].sort((a, b) => new Date(b.date) - new Date(a.date));
    return sorted[0]?.mood?.label || null;
  } catch {
    return null;
  }
}
