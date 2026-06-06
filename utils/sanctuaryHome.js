import AsyncStorage from '@react-native-async-storage/async-storage';

export const SANCTUARY_REMINDERS = [
  "You don't have to carry everything at once. You are allowed to move gently.",
  'Your emotions are messages, not problems. Listen with kindness.',
  'Rest is not a reward you earn. It is something you are allowed.',
  'You showed up today. That counts more than doing it perfectly.',
];

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const TZ_IANA = {
  'US Eastern': 'America/New_York',
  'US Central': 'America/Chicago',
  'US Mountain': 'America/Denver',
  'US Pacific': 'America/Los_Angeles',
};

/** Map settings label or IANA id → timezone for Intl. Defaults US Eastern. */
export function resolveTimezoneId(labelOrTz = 'US Eastern') {
  if (TZ_IANA[labelOrTz]) return TZ_IANA[labelOrTz];
  if (typeof labelOrTz === 'string' && labelOrTz.includes('/')) return labelOrTz;
  return 'America/New_York';
}

/** Local hour (0–23) in the given IANA timezone. */
export function hourInTimezone(timeZone = 'America/New_York', date = new Date()) {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hour12: false,
    }).formatToParts(date);
    const hourPart = parts.find((p) => p.type === 'hour');
    if (hourPart) return Number.parseInt(hourPart.value, 10) % 24;
  } catch {
    /* fall through */
  }
  return date.getHours();
}

/** Greeting from hour (0–23). */
export function greetingForHour(hour = new Date().getHours()) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Greeting aligned with circadian theme phases (6–11 morning, 12–17 afternoon, 18–21 evening, 22–5 night).
 * Avoids "Good morning" while the night canvas is showing (before 6am).
 */
export function greetingForCircadianHour(hour = new Date().getHours()) {
  if (hour >= 6 && hour <= 11) return 'Good morning';
  if (hour >= 12 && hour <= 17) return 'Good afternoon';
  if (hour >= 18 && hour <= 21) return 'Good evening';
  if (hour >= 22) return 'Good evening';
  return 'Hello';
}

/** Time-of-day greeting in a specific timezone (e.g. America/New_York). */
export function greetingForTimezone(timeZone = 'America/New_York', date = new Date()) {
  return greetingForHour(hourInTimezone(timeZone, date));
}

/** Circadian-aware greeting for Sanctuary home (matches day/night visuals). */
export function greetingForCircadianTimezone(timeZone = 'America/New_York', date = new Date()) {
  return greetingForCircadianHour(hourInTimezone(timeZone, date));
}

function startOfWeekMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + diff);
  return d;
}

function sameLocalDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

/**
 * @param {Array<{ date: string; mood?: { emoji?: string; label?: string } }>} checkIns
 */
export function buildWeekMoodStrip(checkIns = []) {
  const now = new Date();
  const weekStart = startOfWeekMonday(now);
  const todayIdx = (now.getDay() + 6) % 7;

  return DAY_LABELS.map((label, i) => {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + i);
    const entry = checkIns.find((c) => {
      try {
        return sameLocalDay(new Date(c.date), dayDate);
      } catch {
        return false;
      }
    });
    return {
      label,
      isToday: i === todayIdx,
      checked: Boolean(entry),
      moodEmoji: entry?.mood?.emoji ?? null,
      moodLabel: entry?.mood?.label ?? null,
    };
  });
}

/**
 * @param {Array<{ date: string; mood?: { emoji?: string; label?: string } }>} checkIns
 */
export function getTodayCheckIn(checkIns = []) {
  const now = new Date();
  return checkIns.find((c) => {
    try {
      return sameLocalDay(new Date(c.date), now);
    } catch {
      return false;
    }
  });
}

/** Replace today's check-in (local calendar day) or append if none exists. */
export async function saveTodayCheckIn({ mood, note = '' }) {
  const saved = await AsyncStorage.getItem('checkIns');
  const all = saved ? JSON.parse(saved) : [];
  const now = new Date();
  const withoutToday = all.filter((c) => {
    try {
      return !sameLocalDay(new Date(c.date), now);
    } catch {
      return true;
    }
  });
  const entry = {
    id: Date.now(),
    date: now.toISOString(),
    mood,
    note: typeof note === 'string' ? note.trim() : '',
  };
  await AsyncStorage.setItem('checkIns', JSON.stringify([entry, ...withoutToday]));
  return entry;
}

/** Remove today's check-in for the local calendar day. */
export async function deleteTodayCheckIn() {
  const saved = await AsyncStorage.getItem('checkIns');
  const all = saved ? JSON.parse(saved) : [];
  const now = new Date();
  const withoutToday = all.filter((c) => {
    try {
      return !sameLocalDay(new Date(c.date), now);
    } catch {
      return true;
    }
  });
  await AsyncStorage.setItem('checkIns', JSON.stringify(withoutToday));
}

/** @param {Array<{ date: string }>} checkIns */
export function countWeekCheckIns(checkIns = []) {
  return buildWeekMoodStrip(checkIns).filter((d) => d.checked).length;
}
