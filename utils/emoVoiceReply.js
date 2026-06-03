import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  callAnthropicMessages,
  describeAnthropicError,
  isAnthropicConfigured,
} from './anthropic';
import { classifyEmoIntent } from './emoIntent';
import { getVoiceSystemPrompt, getCrisisSafetyAppendix } from './emoEos';
import { detectCrisisSignals } from './emoCrisis';
import { generateEmoOpening, getSyncFallbackOpening, stripGenericGreetingPrefix } from './emoOpening';
import { buildEmoPersonalContextBlock } from './emoPersonalContext';

async function composeVoiceSystem({ userName, userText, crisis, mode }) {
  const name = userName?.trim() || 'friend';
  const personalContext = await buildEmoPersonalContextBlock(userName);
  const base = crisis.inCrisis
    ? getVoiceSystemPrompt('sanctuary', name)
    : getVoiceSystemPrompt(mode, name);
  return [base, personalContext, crisis.inCrisis ? getCrisisSafetyAppendix() : '']
    .filter(Boolean)
    .join('\n\n');
}

function buildFallbackVoiceReply(userText, userName) {
  const name = userName?.trim() || 'friend';
  const lower = (userText || '').toLowerCase();
  if (/anxious|worried|stress|overwhelm/.test(lower)) {
    return `${name}, I hear the weight in that. Let's breathe together for a moment — you're not carrying this alone.`;
  }
  if (/sad|heavy|tired|lonely/.test(lower)) {
    return `${name}, thank you for trusting me with that. However heavy it feels right now, this moment can be softer.`;
  }
  if (/happy|good|grateful|better/.test(lower)) {
    return `${name}, I love hearing that light in your voice. Let's savor it — what feels most true for you today?`;
  }
  return `${name}, I'm right here with you. Tell me more — or simply let the silence be enough for now.`;
}

async function readTodayMoodLabel() {
  try {
    const raw = await AsyncStorage.getItem('checkIns');
    if (!raw) return null;
    const checkIns = JSON.parse(raw);
    const today = new Date().toDateString();
    const entry = checkIns.find((c) => new Date(c.date).toDateString() === today);
    return entry?.mood?.label ?? null;
  } catch {
    return null;
  }
}

export async function generateVoiceReply({ userText, userName } = {}) {
  const text = userText?.trim();
  if (!text) return buildFallbackVoiceReply('', userName);

  const moodLabel = await readTodayMoodLabel();
  const name = userName?.trim() || 'friend';
  const { mode } = classifyEmoIntent(text);
  const crisis = detectCrisisSignals(text);
  const voiceSystem = await composeVoiceSystem({ userName, userText: text, crisis, mode });

  const context = moodLabel
    ? `User name: ${name}\nToday's check-in mood: ${moodLabel}\nUser said aloud: "${text}"`
    : `User name: ${name}\nUser said aloud: "${text}"`;

  if (!isAnthropicConfigured()) {
    return buildFallbackVoiceReply(text, userName);
  }

  try {
    const result = await callAnthropicMessages({
      maxTokens: 120,
      system: voiceSystem,
      messages: [{ role: 'user', content: `${context}\n\nReply for voice (spoken aloud only):` }],
    });

    if (!result.ok) {
      if (__DEV__) console.warn('Voice Anthropic error', result.status, result.error);
      if (result.error?.type === 'authentication_error') {
        return describeAnthropicError(result.data);
      }
      throw new Error(result.error?.message || 'Voice reply failed');
    }

    const reply = stripGenericGreetingPrefix(
      result.data?.content?.[0]?.text?.trim().replace(/^["']|["']$/g, '') || '',
    );
    if (!reply || reply.length > 320 || /^(hey|hi|hello)\b/i.test(reply)) {
      return buildFallbackVoiceReply(text, userName);
    }
    return reply;
  } catch {
    return buildFallbackVoiceReply(text, userName);
  }
}

export async function generateVoiceGreeting(userName) {
  const moodLabel = await readTodayMoodLabel();
  const { chipLabel, active } = await import('./emoPersonalContext').then((m) =>
    m.loadEmoPersonalContext(userName),
  );
  const memoryHint = active && chipLabel ? `Emo holds gentle context: ${chipLabel}.` : '';
  const emotionalContext = [moodLabel ? `Today's check-in mood: ${moodLabel}` : '', memoryHint]
    .filter(Boolean)
    .join(' ');
  try {
    return await generateEmoOpening({
      userName,
      channel: 'voice',
      emotionalContext,
    });
  } catch {
    return getSyncFallbackOpening(userName, 'voice');
  }
}

export { buildFallbackVoiceReply };
