import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  formatBriefingContext,
  getTodayDayKey,
  MORNING_BRIEFING_CACHE_KEY,
  summarizeTodayTasks,
} from './todayTriage';

import {
  callAnthropicMessages,
  getAnthropicApiKey,
} from './anthropic';

const BRIEFING_SYSTEM_PROMPT = `You are Emo — Intelligence with Soul. You write a single Morning Guidance Banner: one tailored sentence (max 220 characters) that frames the user's day ahead.

Combine their check-in mood with today's energy-triaged tasks. Be emotionally intelligent:
- Heavy/Anxious/Overwhelmed mood + many Deep Creative Focus tasks → protect energy, sequence wisely, honor rest.
- Radiant moods → channel clarity into deep work first.
- Low Energy Admin stacks → suggest gentle batching without pressure.
- Restorative tasks → affirm them as essential, not optional.

Output ONLY the banner line. No quotes, markdown, or preamble. Warm, precise, elegant. Use their name once if provided.`;

function buildFallbackBriefing({ userName, moodLabel, tasks }) {
  const name = userName?.trim() || 'friend';
  const summary = summarizeTodayTasks(tasks);
  const heavy = ['Heavy', 'Anxious', 'Overwhelmed'].includes(moodLabel);

  if (!summary.pendingCount) {
    return `${name}, your slate is open today — move at the pace your body asks for.`;
  }

  if (heavy && summary.deepFocusPending >= 2) {
    return `${name}, your agenda holds significant weight today. Tackle one deep focus block while morning clarity is here, then protect your evening with rest.`;
  }

  if (summary.deepFocusPending >= 1 && !heavy) {
    return `${name}, lead with your deepest creative work first — your focus deserves the morning light.`;
  }

  if (summary.restorativePending >= 1 && summary.deepFocusPending === 0) {
    return `${name}, today asks for gentle pacing — honor the restorative moments you've planned.`;
  }

  if (summary.lowAdminPending >= 2) {
    return `${name}, batch your light admin gently — small clears, no rush, one breath between each.`;
  }

  return `${name}, your day is mapped with care — begin with what matters most, then soften into the rest.`;
}

export async function loadCachedMorningBriefing(dayKey = getTodayDayKey(), moodLabel = '') {
  const raw = await AsyncStorage.getItem(MORNING_BRIEFING_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed.dayKey === dayKey && parsed.moodLabel === (moodLabel || 'none') && parsed.text) {
      return parsed.text;
    }
    return null;
  } catch {
    return null;
  }
}

async function cacheMorningBriefing(dayKey, moodLabel, text) {
  await AsyncStorage.setItem(
    MORNING_BRIEFING_CACHE_KEY,
    JSON.stringify({ dayKey, moodLabel: moodLabel || 'none', text, generatedAt: new Date().toISOString() }),
  );
}

export async function generateMorningBriefing({
  userName,
  moodLabel,
  ambientProgress,
  tasks,
  force = false,
} = {}) {
  const dayKey = getTodayDayKey();
  const moodKey = moodLabel || 'none';

  if (!force) {
    const cached = await loadCachedMorningBriefing(dayKey, moodKey);
    if (cached) return cached;
  }

  const context = formatBriefingContext(tasks, moodLabel, ambientProgress, userName);
  const apiKey = getAnthropicApiKey();

  let text;

  if (!apiKey) {
    text = buildFallbackBriefing({ userName, moodLabel, tasks });
  } else {
    try {
      const result = await callAnthropicMessages({
        maxTokens: 120,
        system: BRIEFING_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `${context}\n\nWrite the Morning Guidance Banner (one sentence only).`,
          },
        ],
      });

      if (!result.ok) throw new Error(result.error?.message || 'Briefing failed');

      text = result.data?.content?.[0]?.text?.trim().replace(/^["']|["']$/g, '') || '';
      if (!text || text.length > 260) {
        text = buildFallbackBriefing({ userName, moodLabel, tasks });
      }
    } catch {
      text = buildFallbackBriefing({ userName, moodLabel, tasks });
    }
  }

  await cacheMorningBriefing(dayKey, moodKey, text);
  return text;
}

export { buildFallbackBriefing };
