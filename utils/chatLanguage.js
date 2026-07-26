/**
 * Chat language preference for Emo / Oracle.
 * Burmese follows native-first gold standard (utils/emoBurmese.js).
 */

import {
  getEmoPersonalityBurmese,
  shouldComposeInBurmese,
} from './emoBurmese.js';

/** @typedef {'auto' | 'en' | 'my' | 'es'} ChatLanguageId */

/** @type {readonly ChatLanguageId[]} */
export const CHAT_LANGUAGE_IDS = ['auto', 'en', 'my', 'es'];

export const DEFAULT_CHAT_LANGUAGE = /** @type {ChatLanguageId} */ ('auto');

/** @type {{ id: ChatLanguageId; label: string; shortLabel: string }[]} */
export const CHAT_LANGUAGE_OPTIONS = [
  { id: 'auto', label: 'Auto', shortLabel: 'Auto' },
  { id: 'en', label: 'English', shortLabel: 'English' },
  { id: 'my', label: 'မြန်မာ', shortLabel: 'မြန်မာ' },
  { id: 'es', label: 'Español', shortLabel: 'Español' },
];

/**
 * @param {unknown} value
 * @returns {ChatLanguageId}
 */
export function normalizeChatLanguage(value) {
  if (typeof value === 'string' && CHAT_LANGUAGE_IDS.includes(/** @type {ChatLanguageId} */ (value))) {
    return /** @type {ChatLanguageId} */ (value);
  }
  return DEFAULT_CHAT_LANGUAGE;
}

/**
 * @param {ChatLanguageId | string | undefined} preference
 */
export function getChatLanguageLabel(preference) {
  const id = normalizeChatLanguage(preference);
  return CHAT_LANGUAGE_OPTIONS.find((o) => o.id === id)?.label || 'Auto';
}

/**
 * @param {ChatLanguageId | string | undefined} preference
 * @param {{ userMessage?: string; recentUserTexts?: string[] }} [ctx]
 */
export function resolveComposeInBurmese(preference, ctx = {}) {
  return shouldComposeInBurmese(
    normalizeChatLanguage(preference),
    ctx.userMessage || '',
    ctx.recentUserTexts || [],
  );
}

/**
 * Non-Burmese language appendix (English / Spanish / Auto-default).
 * @param {ChatLanguageId | string | undefined} preference
 */
function getNonBurmeseLanguageAppendix(preference) {
  const id = normalizeChatLanguage(preference);

  if (id === 'en') {
    return `## LANGUAGE
Reply in clear everyday English.
Keep the same calm, warm, simple personality.
You can understand Burmese. If the user clearly asks you to speak Burmese, switch to native Burmese composition for that conversation (see Burmese capability — never claim Burmese is limited).
Otherwise stay in English.`;
  }

  if (id === 'es') {
    return `## LANGUAGE
Reply in natural everyday Spanish.
Use a warm, clear register (neutral Latin American-friendly Spanish is fine unless the user clearly uses another variety).
Keep the same calm Emo / Oracle personality and length rules.
If the user writes in English, still reply in Spanish unless they clearly ask for English.
Memory recall must stay factually accurate even when phrased in Spanish.`;
  }

  // auto (when not composing in Burmese)
  return `## LANGUAGE
Match the language the user is writing in (especially English or Spanish).
If they write mainly in Myanmar script, compose in native Burmese (never English-first translation).
If they mix languages, follow their lead naturally.
When the language is unclear, use clear everyday English.
Never claim Burmese ability is limited.
Keep the same calm personality and length rules.
Memory recall must stay factually accurate.`;
}

/**
 * Full language / locale appendix for the system prompt.
 * @param {ChatLanguageId | string | undefined} preference
 * @param {string} [userName]
 * @param {{ userMessage?: string; recentUserTexts?: string[] }} [ctx]
 */
export function getChatLanguageAppendix(preference, userName, ctx = {}) {
  if (resolveComposeInBurmese(preference, ctx)) {
    return getEmoPersonalityBurmese(userName);
  }
  return getNonBurmeseLanguageAppendix(preference);
}
