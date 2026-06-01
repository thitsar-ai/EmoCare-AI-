export const SANCTUARY_REMINDERS = [
  "You don't have to carry everything at once. You are allowed to move gently.",
  'Your emotions are messages, not problems. Listen with kindness.',
  'Rest is not a reward you earn. It is something you are allowed.',
  'You showed up today. That counts more than doing it perfectly.',
];

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Local device hour — never UTC. */
export function greetingForHour(hour = new Date().getHours()) {
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
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

/** @param {Array<{ date: string }>} checkIns */
export function countWeekCheckIns(checkIns = []) {
  return buildWeekMoodStrip(checkIns).filter((d) => d.checked).length;
}
