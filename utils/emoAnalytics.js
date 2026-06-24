import AsyncStorage from '@react-native-async-storage/async-storage';

/** Maps check-in mood → Skia ambientProgress (champagne 0 → obsidian 1). */
export const MOOD_AMBIENT_PROGRESS = {
  Peaceful: 0.06,
  Light: 0.18,
  Grateful: 0.10,
  Hopeful: 0.26,
  Neutral: 0.42,
  Tired: 0.52,
  Heavy: 0.88,
  Anxious: 0.80,
  Overwhelmed: 0.94,
};

export const MOOD_GRAPH_SCORE = {
  Peaceful: 0.82,
  Light: 0.74,
  Grateful: 0.78,
  Hopeful: 0.7,
  Neutral: 0.52,
  Tired: 0.42,
  Heavy: 0.34,
  Anxious: 0.28,
  Overwhelmed: 0.22,
};

export const STORAGE_KEYS = {
  checkIns: 'checkIns',
  journal: 'journalEntries',
  oracleLog: 'oracleTopicLog',
  weeklyLetter: 'weeklyEmoLetter',
};

function parseJson(raw, fallback) {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isWithinLastDays(isoDate, days, anchor = new Date()) {
  const d = startOfDay(isoDate);
  const cutoff = startOfDay(anchor);
  cutoff.setDate(cutoff.getDate() - (days - 1));
  return d >= cutoff && d <= startOfDay(anchor);
}

export function getMoodAmbientProgress(label) {
  if (!label) return null;
  return MOOD_AMBIENT_PROGRESS[label] ?? 0.45;
}

export function getMoodGraphScore(label) {
  if (!label) return null;
  return MOOD_GRAPH_SCORE[label] ?? 0.5;
}

export async function loadEmoStorageBlocks() {
  const [checkInsRaw, journalRaw, oracleRaw] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.checkIns),
    AsyncStorage.getItem(STORAGE_KEYS.journal),
    AsyncStorage.getItem(STORAGE_KEYS.oracleLog),
  ]);

  return {
    checkIns: parseJson(checkInsRaw, []),
    journalEntries: parseJson(journalRaw, []),
    oracleLog: parseJson(oracleRaw, []),
  };
}

export async function aggregateWeeklyEmoData(days = 7, anchorDate = new Date()) {
  const { checkIns, journalEntries, oracleLog } = await loadEmoStorageBlocks();

  const moodVectors = checkIns
    .filter((entry) => isWithinLastDays(entry.date, days, anchorDate))
    .map((entry) => {
      const label = entry.mood?.label;
      return {
        date: entry.date,
        dayLabel: new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        moodLabel: label,
        emoji: entry.mood?.emoji,
        ambientProgress: getMoodAmbientProgress(label),
        graphScore: getMoodGraphScore(label),
        note: entry.note?.trim()?.slice(0, 180) || '',
        intensity: typeof entry.intensity === 'number' ? entry.intensity : null,
      };
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const journalExcerpts = journalEntries
    .filter((entry) => isWithinLastDays(entry.date, days, anchorDate))
    .map((entry) => ({
      date: entry.date,
      dayLabel: new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      text: entry.text?.trim()?.slice(0, 320) || '',
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const oracleTopics = oracleLog
    .filter((entry) => isWithinLastDays(entry.date, days, anchorDate))
    .map((entry) => ({
      date: entry.date,
      dayLabel: new Date(entry.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      query: entry.query || entry.message?.slice(0, 120) || '',
      message: entry.message?.slice(0, 160) || '',
      sourceTitles: (entry.sourceTitles || []).slice(0, 3),
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const ambientValues = moodVectors.map((v) => v.ambientProgress).filter((v) => typeof v === 'number');
  const graphValues = moodVectors.map((v) => v.graphScore).filter((v) => typeof v === 'number');

  const summary = {
    checkInCount: moodVectors.length,
    journalCount: journalExcerpts.length,
    oracleCount: oracleTopics.length,
    avgAmbient: ambientValues.length
      ? ambientValues.reduce((a, b) => a + b, 0) / ambientValues.length
      : null,
    avgGraphScore: graphValues.length
      ? graphValues.reduce((a, b) => a + b, 0) / graphValues.length
      : null,
    dominantTone: ambientValues.length
      ? (ambientValues.reduce((a, b) => a + b, 0) / ambientValues.length <= 0.35 ? 'radiant' : ambientValues.reduce((a, b) => a + b, 0) / ambientValues.length >= 0.65 ? 'consoling' : 'balanced')
      : 'unknown',
  };

  const rangeStart = startOfDay(anchorDate);
  rangeStart.setDate(rangeStart.getDate() - (days - 1));

  return {
    days,
    weekRange: {
      start: rangeStart.toISOString(),
      end: startOfDay(anchorDate).toISOString(),
      label: `${rangeStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${anchorDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
    },
    moodVectors,
    journalExcerpts,
    oracleTopics,
    summary,
  };
}

export function formatWeeklyDataBlock(data, userName) {
  const name = userName?.trim() || 'friend';
  const moodLines = data.moodVectors.length
    ? data.moodVectors.map((v) => `- ${v.dayLabel}: ${v.moodLabel}${v.emoji ? ` ${v.emoji}` : ''} · ambient ${v.ambientProgress?.toFixed(2) ?? '—'} · score ${v.graphScore?.toFixed(2) ?? '—'}${v.note ? ` · note: "${v.note}"` : ''}`).join('\n')
    : '- No check-ins recorded this week.';

  const journalLines = data.journalExcerpts.length
    ? data.journalExcerpts.map((j) => `- ${j.dayLabel}: "${j.text}"`).join('\n')
    : '- No journal entries this week.';

  const oracleLines = data.oracleTopics.length
    ? data.oracleTopics.map((o) => `- ${o.dayLabel}: query "${o.query}"${o.sourceTitles?.length ? ` · sources: ${o.sourceTitles.join(', ')}` : ''}`).join('\n')
    : '- No Oracle research queries this week.';

  return `Weekly Emo Letter data for ${name}
Week: ${data.weekRange.label}
Summary: ${data.summary.checkInCount} check-ins · ${data.summary.journalCount} journal entries · ${data.summary.oracleCount} Oracle inquiries · dominant tone: ${data.summary.dominantTone}${data.summary.avgAmbient != null ? ` · avg ambient ${data.summary.avgAmbient.toFixed(2)}` : ''}

--- Mood check-in vectors (ambient 0=champagne radiance, 1=velvet consoling) ---
${moodLines}

--- Journal excerpts ---
${journalLines}

--- Oracle Mode topics (Tavily research) ---
${oracleLines}`;
}

export function hasEnoughWeeklyData(data) {
  return data.summary.checkInCount > 0
    || data.summary.journalCount > 0
    || data.summary.oracleCount > 0;
}
