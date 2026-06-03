import AsyncStorage from '@react-native-async-storage/async-storage';
import { callAnthropicMessages, isAnthropicConfigured } from './anthropic';
import { getMeditationSystemPrompt, getStorySystemPrompt } from './emoEos';

/** @typedef {'quick' | 'meditation' | 'story'} VoiceSessionType */

export const VOICE_SESSION_LABELS = {
  meditation: 'Guided meditation',
  story: 'Calm story',
};

const MEDITATION_PROMPT = getMeditationSystemPrompt();

const STORY_PROMPT = getStorySystemPrompt();

const SESSION_MAX_TOKENS = {
  meditation: 1100,
  story: 850,
};

const SESSION_MAX_CHARS = {
  meditation: 3200,
  story: 2400,
};

const CHUNK_MAX_CHARS = 480;

/**
 * @param {string} text
 * @returns {VoiceSessionType}
 */
export function detectVoiceSessionType(text) {
  const m = (text || '').trim().toLowerCase();
  if (!m) return 'quick';
  if (/^session:meditation\b/.test(m)) return 'meditation';
  if (/^session:story\b/.test(m)) return 'story';
  if (/\b(guided meditation|lead me through (a )?meditation|meditation session|help me meditate|mindful meditation|body scan|breathing meditation)\b/.test(m)) {
    return 'meditation';
  }
  if (/\b(tell me a (calm|gentle|soothing|peaceful)? ?story|read me a story|bedtime story|calm story|story to help me (sleep|relax|calm))\b/.test(m)) {
    return 'story';
  }
  return 'quick';
}

/**
 * Split long spoken text into ElevenLabs-friendly chunks at sentence boundaries.
 * @param {string} text
 * @returns {string[]}
 */
export function splitSpokenTextIntoChunks(text, maxChars = CHUNK_MAX_CHARS) {
  const normalized = (text || '')
    .trim()
    .replace(/\n{2,}/g, ' ... ')
    .replace(/\s+/g, ' ');

  if (!normalized) return [];
  if (normalized.length <= maxChars) return [normalized];

  const sentences = normalized.match(/[^.!?…]+(?:[.!?…]+|\.\.\.)/g) || [normalized];
  const chunks = [];
  let current = '';

  for (const raw of sentences) {
    const sentence = raw.trim();
    if (!sentence) continue;

    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    if (current) chunks.push(current.trim());
    if (sentence.length <= maxChars) {
      current = sentence;
    } else {
      let offset = 0;
      while (offset < sentence.length) {
        chunks.push(sentence.slice(offset, offset + maxChars).trim());
        offset += maxChars;
      }
      current = '';
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.filter(Boolean);
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

function buildSessionUserMessage({ sessionType, userText, userName, moodLabel }) {
  const name = userName?.trim() || 'friend';
  const moodLine = moodLabel ? `Their check-in mood today: ${moodLabel}.` : '';
  const request = userText?.trim().replace(/^session:(meditation|story)\s*/i, '').trim();
  const extra = request && !/^session:/i.test(request)
    ? `They also said: "${request}"`
    : '';

  if (sessionType === 'meditation') {
    return `Guide ${name} through a spoken meditation now. ${moodLine} ${extra}`.trim();
  }
  return `Tell ${name} a calming spoken story now. ${moodLine} ${extra}`.trim();
}

/**
 * @returns {Promise<{ segments: string[], sessionType: VoiceSessionType, estimatedMinutes: number } | null>}
 */
export async function generateVoiceSession({ sessionType, userText, userName }) {
  if (sessionType !== 'meditation' && sessionType !== 'story') return null;

  if (!isAnthropicConfigured()) return null;

  const moodLabel = await readTodayMoodLabel();
  const system = sessionType === 'meditation' ? MEDITATION_PROMPT : STORY_PROMPT;
  const userMessage = buildSessionUserMessage({ sessionType, userText, userName, moodLabel });

  const result = await callAnthropicMessages({
    maxTokens: SESSION_MAX_TOKENS[sessionType],
    system,
    messages: [{ role: 'user', content: userMessage }],
  });

  if (!result.ok) {
    throw new Error(result.error?.message || 'Session generation failed');
  }

  let prose = result.data?.content?.[0]?.text?.trim() || '';
  prose = prose
    .replace(/^["']|["']$/g, '')
    .replace(/\*\*/g, '')
    .replace(/^#+\s*/gm, '');

  const maxChars = SESSION_MAX_CHARS[sessionType];
  if (prose.length > maxChars) {
    prose = `${prose.slice(0, maxChars).replace(/\s+\S*$/, '')}...`;
  }

  const segments = splitSpokenTextIntoChunks(prose);
  if (!segments.length) return null;

  const wordCount = prose.split(/\s+/).length;
  const estimatedMinutes = Math.max(2, Math.round(wordCount / 130));

  return { segments, sessionType, estimatedMinutes };
}

export function getSessionStatusLabel(sessionType, phase = 'preparing') {
  if (sessionType === 'meditation') {
    if (phase === 'generating') return 'Preparing your meditation…';
    if (phase === 'speaking') return 'Guided meditation · breathe with Emo';
    return 'Guided meditation';
  }
  if (sessionType === 'story') {
    if (phase === 'generating') return 'Weaving a calm story…';
    if (phase === 'speaking') return 'Calm story · listen softly';
    return 'Calm story';
  }
  return 'Emo is speaking…';
}

export function getSessionStarterText(sessionType) {
  if (sessionType === 'meditation') return 'session:meditation Please guide me through a gentle calming meditation.';
  return 'session:story Please tell me a gentle calming story to help me relax.';
}
