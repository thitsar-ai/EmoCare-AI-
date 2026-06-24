import { callAnthropicMessages, isAnthropicConfigured } from './anthropic';

function buildFallbackReflection(entries) {
  if (!entries?.length) return '';
  if (entries.length === 1) {
    return `You checked in as ${entries[0].moodLabel} — one honest moment, held gently.`;
  }
  const parts = entries.map((e) => `${e.partOfDay.toLowerCase()}: ${e.moodLabel}`).join(', ');
  return `Your day moved through ${parts}. Even when feelings shifted, you kept showing up for yourself.`;
}

/**
 * Generate a gentle one-line reflection for a day's mood journey.
 * Uses Anthropic when configured; otherwise a simple non-fabricated fallback.
 */
export async function generateDayArcReflection(dayLabel, entries) {
  if (!entries?.length) return '';

  if (entries.length === 1) {
    return buildFallbackReflection(entries);
  }

  if (!isAnthropicConfigured()) {
    return buildFallbackReflection(entries);
  }

  const arcLines = entries
    .map((e) => `${e.partOfDay}: ${e.moodEmoji ? `${e.moodEmoji} ` : ''}${e.moodLabel}`)
    .join('\n');

  const result = await callAnthropicMessages({
    system:
      'You write one gentle sentence reflecting a person\'s emotional arc through their day. Be warm, never clinical. Do not invent moods that were not listed. Max 28 words.',
    messages: [
      {
        role: 'user',
        content: `${dayLabel}\n${arcLines}\n\nWrite one gentle reflection sentence about this emotional arc.`,
      },
    ],
    maxTokens: 120,
  });

  const replyText =
    result.ok && result.data?.content
      ? result.data.content.find((b) => b.type === 'text')?.text?.trim()
      : '';

  if (replyText) {
    return replyText;
  }

  return buildFallbackReflection(entries);
}
