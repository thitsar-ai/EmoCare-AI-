/**
 * @param {string} [label] e.g. "8:00 PM"
 * @returns {{ hour: number, minute: number }}
 */
export function parseReminderTimeLabel(label) {
  const m = String(label || '')
    .trim()
    .match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return { hour: 20, minute: 0 };
  let hour = Number.parseInt(m[1], 10);
  const minute = Number.parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === 'AM') {
    if (hour === 12) hour = 0;
  } else if (hour !== 12) {
    hour += 12;
  }
  return { hour: Math.min(23, Math.max(0, hour)), minute: Math.min(59, Math.max(0, minute)) };
}
