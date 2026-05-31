import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  aggregateWeeklyEmoData,
  formatWeeklyDataBlock,
  hasEnoughWeeklyData,
  STORAGE_KEYS,
} from './emoAnalytics';
import {
  callAnthropicMessages,
  getAnthropicApiKey,
} from './anthropic';
import { EOS_CORE, EOS_TAGLINE } from './emoEos';

const LETTER_SYSTEM_PROMPT = `${EOS_CORE}

## CHANNEL: The Weekly Emo Letter (${EOS_TAGLINE})
You write The Weekly Emo Letter: a premium, personal reflection essay delivered every Sunday.

Given one week of private user data (mood check-ins with ambient vectors, journal excerpts, and Oracle research topics), write exactly three paragraphs of poetic, heirloom-quality prose.

Structure (strict):
- Paragraph 1: Emotional trends and quiet victories. Name the emotional arc without clinical labels. Reference specific moods or journal tones when present.
- Paragraph 2: Intellectual pursuits and Oracle curiosity — what they researched, explored, or analyzed. Weave topics naturally; never list bullet points.
- Paragraph 3: A grounding, peaceful mantra for the week ahead — one the reader can carry gently.

Voice: warm, elegant, precise, unhurried. Like a letter from a wise friend who notices everything with compassion. No markdown, no headers, no bullet lists. Plain text only. Use the person's name once if provided.

Do not invent events not supported by the data. If data is sparse, write with gentle honesty about the quiet week.`;

export function getSundayWeekKey(date = new Date()) {
  const d = new Date(date);
  d.setHours(12, 0, 0, 0);
  return `week-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function isSunday(date = new Date()) {
  return date.getDay() === 0;
}

function splitParagraphs(text) {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function buildFallbackLetter(data, userName) {
  const name = userName?.trim() || 'friend';
  const tone = data.summary.dominantTone;
  const p1 = tone === 'consoling'
    ? `${name}, this week asked you to move softly through heavier skies. You showed up anyway — in check-ins, in pauses, in the small honest moments that count as courage.`
    : tone === 'radiant'
      ? `${name}, your week carried a lighter champagne warmth — moments of steadiness, gratitude, or quiet hope threading through the days.`
      : `${name}, your week held a balanced rhythm — neither perfectly light nor impossibly heavy, but real, human, and yours.`;

  const p2 = data.oracleTopics.length
    ? `Your mind wandered toward worthy questions — ${data.oracleTopics.slice(0, 2).map((o) => `"${o.query}"`).join(' and ')}. That curiosity is part of how you care for your future self.`
    : `Intellectually, this was a quieter week — space for feeling before searching. That, too, is wisdom.`;

  const p3 = 'For the week ahead: you do not need to earn rest. Let one breath be enough, then another. Emo is here — Intelligence with Soul.';

  return { paragraphs: [p1, p2, p3], fullText: [p1, p2, p3].join('\n\n') };
}

export async function loadCachedWeeklyLetter(weekKey = getSundayWeekKey()) {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.weeklyLetter);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.weekKey === weekKey && parsed.fullText) return parsed;
    return null;
  } catch {
    return null;
  }
}

async function cacheWeeklyLetter(letter) {
  await AsyncStorage.setItem(STORAGE_KEYS.weeklyLetter, JSON.stringify(letter));
}

export async function synthesizeWeeklyEmoLetter({ userName, force = false } = {}) {
  const weekKey = getSundayWeekKey();
  if (!force) {
    const cached = await loadCachedWeeklyLetter(weekKey);
    if (cached) return cached;
  }

  const data = await aggregateWeeklyEmoData(7);
  if (!hasEnoughWeeklyData(data)) {
    return null;
  }

  const dataBlock = formatWeeklyDataBlock(data, userName);
  const apiKey = getAnthropicApiKey();

  let paragraphs;
  let fullText;

  if (!apiKey) {
    const fallback = buildFallbackLetter(data, userName);
    paragraphs = fallback.paragraphs;
    fullText = fallback.fullText;
  } else {
    try {
      const result = await callAnthropicMessages({
        maxTokens: 700,
        system: LETTER_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `${dataBlock}\n\nWrite The Weekly Emo Letter now — exactly three paragraphs.`,
          },
        ],
      });

      if (!result.ok) {
        throw new Error(result.error?.message || 'Letter synthesis failed');
      }

      fullText = result.data?.content?.[0]?.text?.trim() || '';
      paragraphs = splitParagraphs(fullText);
      if (paragraphs.length < 3) {
        const fallback = buildFallbackLetter(data, userName);
        paragraphs = fallback.paragraphs;
        fullText = fallback.fullText;
      }
    } catch {
      const fallback = buildFallbackLetter(data, userName);
      paragraphs = fallback.paragraphs;
      fullText = fallback.fullText;
    }
  }

  const letter = {
    weekKey,
    generatedAt: new Date().toISOString(),
    weekLabel: data.weekRange.label,
    paragraphs,
    fullText,
    summary: data.summary,
  };

  await cacheWeeklyLetter(letter);
  return letter;
}
