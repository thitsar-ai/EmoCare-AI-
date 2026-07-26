/**
 * Chat language preference for Emo / Oracle (conversations only).
 * App UI stays English until full localization.
 */

/** @typedef {'auto' | 'en' | 'my' | 'es'} ChatLanguageId */

/** @type {readonly ChatLanguageId[]} */
export const CHAT_LANGUAGE_IDS = ['auto', 'en', 'my', 'es'];

export const DEFAULT_CHAT_LANGUAGE = /** @type {ChatLanguageId} */ ('auto');

/** @type {{ id: ChatLanguageId; label: string; shortLabel: string }[]} */
export const CHAT_LANGUAGE_OPTIONS = [
  { id: 'auto', label: 'Auto', shortLabel: 'Auto' },
  { id: 'en', label: 'English', shortLabel: 'English' },
  {
    id: 'my',
    label: 'English · understands မြန်မာ',
    shortLabel: 'EN · မြန်မာ',
  },
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

const BURMESE_CAPABILITY = `## BURMESE CAPABILITY
You can speak and understand Myanmar / Burmese well — warm, clear, everyday tone (Unicode Myanmar script; never Zawgyi).
Never say your Burmese is limited, weak, or that you prefer English to avoid mistakes.
Never apologize for not being able to speak Burmese.
If asked "Can you speak Burmese?" / "မြန်မာလို ပြောနိုင်လား": answer yes warmly, optionally with one short pleasant Burmese phrase, then continue per the LANGUAGE rules below.
When replying in Burmese, stay the same calm, kind Emo — simple spoken style, not stiff or overly formal.`;

/**
 * Prompt appendix that overrides default English-oriented style rules.
 * @param {ChatLanguageId | string | undefined} preference
 */
export function getChatLanguageAppendix(preference) {
  const id = normalizeChatLanguage(preference);

  if (id === 'en') {
    return `${BURMESE_CAPABILITY}

## LANGUAGE
Reply in clear everyday English.
Keep the same calm, warm, simple personality.
If the user clearly asks you to speak Burmese, switch to warm everyday Burmese for that conversation.
Otherwise stay in English.`;
  }

  if (id === 'my') {
    return `${BURMESE_CAPABILITY}

## LANGUAGE
Default: reply in clear, warm everyday English — pleasant, kind, and easy to understand.
Fully understand Burmese, English, or a mix.
If the user asks you to speak Burmese (or writes mainly in Burmese and clearly wants Burmese back), reply in warm everyday Burmese.
Otherwise stay in English — do not refuse Burmese or claim it is limited.
Be culturally warm and respectful without stereotypes, honorific theater, or forced slang.
Memory recall must stay factually accurate.`;
  }

  if (id === 'es') {
    return `${BURMESE_CAPABILITY}

## LANGUAGE
Reply in natural everyday Spanish.
Use a warm, clear register (neutral Latin American-friendly Spanish is fine unless the user clearly uses another variety).
Keep the same calm Emo / Oracle personality and length rules.
If the user writes in English, still reply in Spanish unless they clearly ask for English.
Memory recall must stay factually accurate even when phrased in Spanish.`;
  }

  return `${BURMESE_CAPABILITY}

## LANGUAGE
Match the language the user is writing in (especially English, Burmese/Myanmar, or Spanish).
If they mix languages, follow their lead naturally.
When the language is unclear, use clear everyday English.
For Burmese, use Unicode Myanmar script and everyday spoken style.
If they ask whether you can speak Burmese, say yes and you may continue in Burmese.
Keep the same calm personality and length rules in every language.
Memory recall must stay factually accurate in whatever language you reply in.`;
}
