/**
 * Privacy-safe Burmese reply feedback — categories only, no full private transcripts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'emoBurmeseFeedbackLog';

/** @typedef {'helpful'|'not_natural'|'wrong_meaning'|'spelling'} BurmeseFeedbackCategory */

export const BURMESE_FEEDBACK_OPTIONS = [
  { id: /** @type {BurmeseFeedbackCategory} */ ('helpful'), labelKey: 'feedbackHelpful' },
  { id: /** @type {BurmeseFeedbackCategory} */ ('not_natural'), labelKey: 'feedbackNotNatural' },
  { id: /** @type {BurmeseFeedbackCategory} */ ('wrong_meaning'), labelKey: 'feedbackWrongMeaning' },
  { id: /** @type {BurmeseFeedbackCategory} */ ('spelling'), labelKey: 'feedbackSpelling' },
];

/**
 * @param {{
 *   category: BurmeseFeedbackCategory;
 *   responseHash?: string;
 *   suggestion?: string;
 *   intent?: string;
 * }} entry
 */
export async function saveBurmeseFeedback(entry) {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    const next = Array.isArray(list) ? list : [];
    next.push({
      category: entry.category,
      responseHash: entry.responseHash || null,
      suggestion: entry.suggestion ? String(entry.suggestion).slice(0, 400) : null,
      intent: entry.intent || null,
      at: new Date().toISOString(),
    });
    // Cap local log
    await AsyncStorage.setItem(KEY, JSON.stringify(next.slice(-200)));
  } catch {
    /* ignore */
  }
}

/**
 * Short non-reversible fingerprint for pairing feedback without storing full text.
 * @param {string} text
 */
export function hashResponseRef(text) {
  const s = String(text || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `r${h.toString(16)}:${s.length}`;
}
