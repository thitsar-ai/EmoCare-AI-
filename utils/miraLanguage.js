/**
 * Mira (legacy internal: Oracle) response language — independent from Emo Talk.
 */

import { containsMyanmarScript, isPrimarilyMyanmar } from './emoBurmese.js';

/** @typedef {'auto' | 'en' | 'my' | 'id'} MiraLanguageId */

/** @type {readonly MiraLanguageId[]} */
export const MIRA_LANGUAGE_IDS = ['auto', 'en', 'my', 'id'];

export const DEFAULT_MIRA_LANGUAGE = /** @type {MiraLanguageId} */ ('auto');

/** @type {{ id: MiraLanguageId; label: string; shortLabel: string }[]} */
export const MIRA_LANGUAGE_OPTIONS = [
  { id: 'auto', label: 'Auto', shortLabel: 'Auto' },
  { id: 'en', label: 'English', shortLabel: 'English' },
  { id: 'my', label: 'မြန်မာ', shortLabel: 'မြန်မာ' },
  { id: 'id', label: 'Bahasa Indonesia', shortLabel: 'Indonesia' },
];

/**
 * @param {unknown} value
 * @returns {MiraLanguageId}
 */
export function normalizeMiraLanguage(value) {
  if (typeof value === 'string' && MIRA_LANGUAGE_IDS.includes(/** @type {MiraLanguageId} */ (value))) {
    return /** @type {MiraLanguageId} */ (value);
  }
  return DEFAULT_MIRA_LANGUAGE;
}

/**
 * @param {MiraLanguageId | string | undefined} preference
 */
export function getMiraLanguageLabel(preference) {
  const id = normalizeMiraLanguage(preference);
  return MIRA_LANGUAGE_OPTIONS.find((o) => o.id === id)?.label || 'Auto';
}

/**
 * @param {unknown} text
 */
function looksIndonesian(text) {
  const s = String(text || '').toLowerCase();
  if (!s || containsMyanmarScript(s)) return false;
  // Lightweight heuristic — Auto prefers clear signals over guessing.
  return /\b(saya|aku|anda|tidak|bisa|bagaimana|mengapa|untuk|dengan|yang|adalah|tolong|terima kasih|kenapa|apa|sudah)\b/.test(
    s,
  );
}

/**
 * @param {MiraLanguageId | string} preference
 * @param {string} [userMessage]
 * @param {string[]} [recentUserTexts]
 * @returns {'en' | 'my' | 'id'}
 */
export function resolveMiraComposeLocale(preference, userMessage = '', recentUserTexts = []) {
  const pref = normalizeMiraLanguage(preference);
  if (pref === 'en' || pref === 'my' || pref === 'id') return pref;

  if (isPrimarilyMyanmar(userMessage) || containsMyanmarScript(userMessage)) return 'my';
  if (looksIndonesian(userMessage)) return 'id';

  const recent = (recentUserTexts || []).filter(Boolean).slice(-4);
  const myTurns = recent.filter((t) => isPrimarilyMyanmar(t) || containsMyanmarScript(t)).length;
  if (myTurns >= 2) return 'my';
  const idTurns = recent.filter(looksIndonesian).length;
  if (idTurns >= 2) return 'id';

  return 'en';
}

/**
 * @param {MiraLanguageId | string} preference
 * @param {string} [userName]
 * @param {{ userMessage?: string; recentUserTexts?: string[] }} [ctx]
 */
export function getMiraLanguageAppendix(preference, userName, ctx = {}) {
  const locale = resolveMiraComposeLocale(
    preference,
    ctx.userMessage || '',
    ctx.recentUserTexts || [],
  );
  const name = String(userName || '').trim() || 'friend';

  if (locale === 'my') {
    return `## LANGUAGE — MIRA BURMESE
You are Mira (not Emo / အီမို, not Oracle). Compose directly in natural Myanmar / Burmese (Unicode, never Zawgyi).
Never write English first and translate.
When referring to the emotional companion, use အီမို (not "Emo" inside fully Burmese replies).
Call yourself Mira only.
Address ${name} sparingly if their name is known.
Stay clear, calm, answer-first. Most replies under 200 words.`;
  }

  if (locale === 'id') {
    return `## LANGUAGE — MIRA BAHASA INDONESIA
You are Mira (not Emo, not Oracle). Reply in natural Bahasa Indonesia — clear, warm, and easy to understand.
Call yourself Mira only. When referring to the emotional companion, say Emo.
Address ${name} sparingly if known.
Stay clear, calm, answer-first. Most replies under 200 words.`;
  }

  return `## LANGUAGE — MIRA ENGLISH
You are Mira (not Emo, not Oracle). Reply in clear everyday English.
Call yourself Mira only. When referring to the emotional companion, say Emo.
Address ${name} sparingly if known.
Stay clear, calm, answer-first. Most replies under 200 words.`;
}

export function miraInputPlaceholder(preference) {
  const id = normalizeMiraLanguage(preference);
  if (id === 'my') return 'Mira ကို မေးလိုတာ ရေးပါရှင်။';
  if (id === 'id') return 'Tanyakan kepada Mira…';
  return 'Ask Mira…';
}
