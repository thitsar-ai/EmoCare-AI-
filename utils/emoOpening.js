import { callAnthropicMessages, getAnthropicApiKey } from './anthropic';
import { getOpeningSystemPrompt } from './emoEos';

const VOICE_FALLBACKS = [
  (name) => `${name}, I'm glad you're here. Take a breath — this moment is yours.`,
  (name) => `${name}, I'm listening. Share whatever feels true, or let the quiet be enough.`,
  (name) => `${name}, you don't have to perform anything for me. Just be here with me for a moment.`,
];

const CHAT_FALLBACKS = [
  (name) => `Hello${name ? `, ${name}` : ''}. I'm really glad you're here.`,
  (name) => `${name ? `${name}, ` : ''}this space is yours. What's on your heart today?`,
];

export function stripGenericGreetingPrefix(text) {
  if (!text) return '';
  return text
    .replace(/^(hey|hi|hello|good (morning|afternoon|evening|to see you))[,!\s—-]*/i, '')
    .trim();
}

export function getSyncFallbackOpening(userName, channel = 'voice') {
  const name = userName?.trim() || 'friend';
  const pool = channel === 'voice' ? VOICE_FALLBACKS : CHAT_FALLBACKS;
  const pick = pool[Math.floor(Math.random() * pool.length)];
  return pick(name);
}

export async function generateEmoOpening({
  userName,
  channel = 'voice',
  emotionalContext = '',
} = {}) {
  const name = userName?.trim() || 'friend';
  const apiKey = getAnthropicApiKey();

  if (!apiKey) {
    return getSyncFallbackOpening(name, channel);
  }

  const prompt = [
    `User name: ${name}`,
    emotionalContext ? emotionalContext : '',
    channel === 'voice'
      ? 'Write a gentle voice greeting Emo will speak aloud when the user opens Talk.'
      : 'Write a gentle chat welcome when the user opens text conversation.',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const result = await callAnthropicMessages({
      maxTokens: 80,
      system: getOpeningSystemPrompt(channel),
      messages: [{ role: 'user', content: prompt }],
    });

    if (!result.ok) {
      return getSyncFallbackOpening(name, channel);
    }

    const raw = result.data?.content?.[0]?.text?.trim().replace(/^["']|["']$/g, '') || '';
    const cleaned = stripGenericGreetingPrefix(raw);
    if (!cleaned || cleaned.length > 220 || /^(hey|hi|hello)\b/i.test(raw)) {
      return getSyncFallbackOpening(name, channel);
    }
    return cleaned;
  } catch {
    return getSyncFallbackOpening(name, channel);
  }
}
