import AsyncStorage from '@react-native-async-storage/async-storage';

/** Queued Check-In context for Talk — consumed once on ChatScreen mount. */
export const PENDING_CHECKIN_TALK_KEY = 'pendingCheckInTalk';

const INTENSITY_LABELS = {
  1: 'whisper',
  2: 'soft',
  3: 'present',
  4: 'strong',
  5: 'deep',
};

/**
 * @param {{ moodLabel: string; moodEmoji?: string; intensity?: number; note?: string }} payload
 */
export async function queueCheckInForTalk(payload) {
  const moodLabel = String(payload?.moodLabel || '').trim();
  if (!moodLabel) return;
  const intensity = Number(payload?.intensity);
  const intensityLabel =
    Number.isFinite(intensity) && INTENSITY_LABELS[intensity]
      ? INTENSITY_LABELS[intensity]
      : null;
  await AsyncStorage.setItem(
    PENDING_CHECKIN_TALK_KEY,
    JSON.stringify({
      moodLabel,
      moodEmoji: payload?.moodEmoji ? String(payload.moodEmoji) : null,
      intensity: Number.isFinite(intensity) ? intensity : null,
      intensityLabel,
      note: payload?.note?.trim() ? String(payload.note).trim() : '',
      savedAt: new Date().toISOString(),
    }),
  );
}

/** Build a calm, non-poetic Talk opener from a queued check-in. */
export function buildCheckInTalkIntro(ctx) {
  if (!ctx?.moodLabel) return null;
  const intensityBit = ctx.intensityLabel ? ` (${ctx.intensityLabel})` : '';
  const note = ctx.note?.trim();
  if (note) {
    return `You checked in as ${ctx.moodLabel}${intensityBit} and wrote: "${note}"\n\nWould you like help sorting through this, or would you rather just talk?`;
  }
  return `You checked in as ${ctx.moodLabel}${intensityBit}. Would you like help sorting through what's going on, or would you rather just talk?`;
}
