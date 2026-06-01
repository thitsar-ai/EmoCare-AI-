import { classifyEmoIntent } from './emoIntent';

export const HOME_LANDING_MODE_KEY = 'homeLandingMode';
export const INITIAL_EMO_INTENT_KEY = 'initialEmoIntent';
export const INITIAL_CHECKIN_PAYLOAD_KEY = 'initialCheckInPayload';

const SANCTUARY_MOODS = new Set(['Heavy', 'Overwhelmed']);
const ORACLE_MOODS = new Set(['Neutral', 'Hopeful']);

/**
 * Build the intent payload from onboarding Screen 4 (mood + journal).
 * @param {{ label: string }} mood
 * @param {string} journalNote
 */
export function buildOnboardingIntentPayload(mood, journalNote = '') {
  const moodLine = mood?.label ? `I'm feeling ${mood.label.toLowerCase()}.` : '';
  const note = journalNote?.trim() || '';
  return [moodLine, note].filter(Boolean).join(' ').trim();
}

/**
 * Resolve home dashboard landing mode from mood + optional journal intent.
 * @param {string} moodLabel
 * @param {string} [journalNote]
 * @returns {'sanctuary' | 'oracle'}
 */
export function resolveHomeLandingMode(moodLabel, journalNote = '') {
  if (SANCTUARY_MOODS.has(moodLabel)) return 'sanctuary';
  if (ORACLE_MOODS.has(moodLabel)) return 'oracle';

  const payload = buildOnboardingIntentPayload({ label: moodLabel }, journalNote);
  if (payload.length >= 3) {
    return classifyEmoIntent(payload).mode;
  }

  if (['Peaceful', 'Grateful', 'Light', 'Joyful'].includes(moodLabel)) {
    return 'sanctuary';
  }

  return 'sanctuary';
}

/**
 * @param {{ label: string }} mood
 * @param {string} journalNote
 */
export function resolveOnboardingSession(mood, journalNote = '') {
  const payload = buildOnboardingIntentPayload(mood, journalNote);
  const intent = payload.length >= 3 ? classifyEmoIntent(payload) : { mode: 'sanctuary', reason: 'onboarding' };
  const landingMode = resolveHomeLandingMode(mood.label, journalNote);

  return {
    payload,
    intentMode: intent.mode,
    landingMode,
  };
}
