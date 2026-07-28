/**
 * Mira (legacy internal: Oracle) response language — independent from Emo Talk.
 */

import { containsMyanmarScript, isPrimarilyMyanmar } from './emoBurmese.js';

/** @typedef {'auto' | 'en' | 'my' | 'id' | 'es' | 'pt-BR' | 'fr'} MiraLanguageId */

/** @type {readonly MiraLanguageId[]} */
export const MIRA_LANGUAGE_IDS = ['auto', 'en', 'my', 'id', 'es', 'pt-BR', 'fr'];

export const DEFAULT_MIRA_LANGUAGE = /** @type {MiraLanguageId} */ ('auto');

/** Localization key: miraInputPlaceholder — English fallback when missing. */
export const MIRA_INPUT_PLACEHOLDER_EN = 'What would you like Mira to explore?';

/** @type {Record<Exclude<MiraLanguageId, 'auto'>, string>} */
export const MIRA_INPUT_PLACEHOLDER_BY_LOCALE = {
  en: MIRA_INPUT_PLACEHOLDER_EN,
  my: 'Mira ကို ဘာအကြောင်း မေးချင်လဲ။',
  id: 'Apa yang ingin Anda jelajahi bersama Mira?',
  'pt-BR': 'O que você gostaria que Mira explorasse?',
  fr: 'Qu’aimeriez-vous que Mira explore ?',
  es: '¿Qué te gustaría que Mira explorara?',
};

/** Shown under Mira’s face on Ask Mira. */
export const MIRA_TAGLINE_EN = 'Research · Strategy · Wise Perspective';

/** @type {Record<Exclude<MiraLanguageId, 'auto'>, string>} */
export const MIRA_TAGLINE_BY_LOCALE = {
  en: MIRA_TAGLINE_EN,
  my: 'သုတေသန · မဟာဗျူဟာ · နက်ရှိုင်းသောအမြင်',
  id: 'Riset • Strategi • Perspektif Bijak',
  'pt-BR': 'Pesquisa • Estratégia • Perspectiva sábia',
  fr: 'Recherche • Stratégie • Perspective éclairée',
  es: 'Investigación • Estrategia • Perspectiva sabia',
};

/** Supporting line under the Mira tagline (empty state). */
export const MIRA_EMPTY_INVITE_EN =
  'Whether you want to research a topic, analyze a decision, or find a more balanced perspective, Mira will think it through with you.';

/** @type {Record<Exclude<MiraLanguageId, 'auto'>, string>} */
export const MIRA_EMPTY_INVITE_BY_LOCALE = {
  en: MIRA_EMPTY_INVITE_EN,
  my: 'သုတေသနတစ်ခု လုပ်ချင်တာပဲဖြစ်ဖြစ်၊ ဆုံးဖြတ်ချက်တစ်ခုကို ခွဲခြမ်းစိတ်ဖြာချင်တာပဲဖြစ်ဖြစ်၊ ပိုမျှတတဲ့အမြင်လိုချင်တာပဲဖြစ်ဖြစ် — Mira က သင့်နဲ့အတူ စဉ်းစားပေးမယ်။',
  id: 'Minta Mira meneliti, menganalisis, atau membimbing Anda…',
  'pt-BR': 'Peça à Mira para pesquisar, analisar ou orientar você…',
  fr: 'Demandez à Mira de rechercher, d’analyser ou de vous guider…',
  es: 'Pídele a Mira que investigue, analice o te guíe…',
};

/** @type {{ id: MiraLanguageId; label: string; shortLabel: string }[]} */
export const MIRA_LANGUAGE_OPTIONS = [
  { id: 'auto', label: 'Auto', shortLabel: 'Auto' },
  { id: 'en', label: 'English', shortLabel: 'English' },
  { id: 'my', label: 'မြန်မာ', shortLabel: 'မြန်မာ' },
  { id: 'id', label: 'Bahasa Indonesia', shortLabel: 'Bahasa Indonesia' },
  { id: 'es', label: 'Español', shortLabel: 'Español' },
  { id: 'pt-BR', label: 'Português (Brasil)', shortLabel: 'Português' },
  { id: 'fr', label: 'Français', shortLabel: 'Français' },
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
  return /\b(saya|aku|anda|tidak|bisa|bagaimana|mengapa|untuk|dengan|yang|adalah|tolong|terima kasih|kenapa|apa|sudah)\b/.test(
    s,
  );
}

/**
 * @param {unknown} text
 */
function looksSpanish(text) {
  const s = String(text || '').toLowerCase();
  if (!s || containsMyanmarScript(s)) return false;
  return /\b(hola|gracias|por favor|qué|cómo|dónde|cuándo|porque|también|después|nunca|siempre)\b/.test(s);
}

/**
 * @param {unknown} text
 */
function looksPortuguese(text) {
  const s = String(text || '').toLowerCase();
  if (!s || containsMyanmarScript(s)) return false;
  return /\b(olá|obrigad[oa]|por favor|você|não|sim|como|onde|quando|porque|também)\b/.test(s);
}

/**
 * @param {unknown} text
 */
function looksFrench(text) {
  const s = String(text || '').toLowerCase();
  if (!s || containsMyanmarScript(s)) return false;
  return /\b(bonjour|merci|s'il vous plaît|comment|pourquoi|parce que|aussi|jamais|toujours|je suis)\b/.test(
    s,
  );
}

/**
 * @param {MiraLanguageId | string} preference
 * @param {string} [userMessage]
 * @param {string[]} [recentUserTexts]
 * @returns {Exclude<MiraLanguageId, 'auto'>}
 */
export function resolveMiraComposeLocale(preference, userMessage = '', recentUserTexts = []) {
  const pref = normalizeMiraLanguage(preference);
  if (pref !== 'auto') return pref;

  if (isPrimarilyMyanmar(userMessage) || containsMyanmarScript(userMessage)) return 'my';
  if (looksIndonesian(userMessage)) return 'id';
  if (looksPortuguese(userMessage)) return 'pt-BR';
  if (looksSpanish(userMessage)) return 'es';
  if (looksFrench(userMessage)) return 'fr';

  const recent = (recentUserTexts || []).filter(Boolean).slice(-4);
  const myTurns = recent.filter((t) => isPrimarilyMyanmar(t) || containsMyanmarScript(t)).length;
  if (myTurns >= 2) return 'my';
  const idTurns = recent.filter(looksIndonesian).length;
  if (idTurns >= 2) return 'id';

  return 'en';
}

/**
 * Localized Mira chat input placeholder (`miraInputPlaceholder`).
 * Falls back to English when a translation is missing.
 * @param {MiraLanguageId | string} preference
 * @param {{ userMessage?: string; recentUserTexts?: string[]; uiLocale?: string }} [ctx]
 */
export function miraInputPlaceholder(preference, ctx = {}) {
  return resolveMiraUiString(preference, ctx, MIRA_INPUT_PLACEHOLDER_BY_LOCALE, MIRA_INPUT_PLACEHOLDER_EN);
}

/**
 * Localized Mira tagline under the companion face.
 * @param {MiraLanguageId | string} preference
 * @param {{ userMessage?: string; recentUserTexts?: string[]; uiLocale?: string }} [ctx]
 */
export function miraTagline(preference, ctx = {}) {
  return resolveMiraUiString(preference, ctx, MIRA_TAGLINE_BY_LOCALE, MIRA_TAGLINE_EN);
}

/**
 * Localized empty-state invite under the Mira tagline.
 * @param {MiraLanguageId | string} preference
 * @param {{ userMessage?: string; recentUserTexts?: string[]; uiLocale?: string }} [ctx]
 */
export function miraEmptyInvite(preference, ctx = {}) {
  return resolveMiraUiString(preference, ctx, MIRA_EMPTY_INVITE_BY_LOCALE, MIRA_EMPTY_INVITE_EN);
}

/**
 * @param {MiraLanguageId | string} preference
 * @param {{ userMessage?: string; recentUserTexts?: string[]; uiLocale?: string }} [ctx]
 * @param {Record<string, string>} byLocale
 * @param {string} englishFallback
 */
function resolveMiraUiString(preference, ctx, byLocale, englishFallback) {
  const pref = normalizeMiraLanguage(preference);
  if (pref !== 'auto') {
    return byLocale[pref] || englishFallback;
  }
  const ui = ctx.uiLocale != null ? normalizeMiraLanguage(ctx.uiLocale) : 'auto';
  if (ui !== 'auto' && byLocale[ui]) {
    return byLocale[ui];
  }
  const locale = resolveMiraComposeLocale(
    preference,
    ctx.userMessage || '',
    ctx.recentUserTexts || [],
  );
  return byLocale[locale] || englishFallback;
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

  if (locale === 'es') {
    return `## LANGUAGE — MIRA SPANISH
You are Mira (not Emo, not Oracle). Reply in natural Spanish.
Call yourself Mira only. When referring to the emotional companion, say Emo.
Address ${name} sparingly if known.
Stay clear, calm, answer-first. Most replies under 200 words.`;
  }

  if (locale === 'pt-BR') {
    return `## LANGUAGE — MIRA PORTUGUESE (BRASIL)
You are Mira (not Emo, not Oracle). Reply in natural Brazilian Portuguese.
Call yourself Mira only. When referring to the emotional companion, say Emo.
Address ${name} sparingly if known.
Stay clear, calm, answer-first. Most replies under 200 words.`;
  }

  if (locale === 'fr') {
    return `## LANGUAGE — MIRA FRENCH
You are Mira (not Emo, not Oracle). Reply in natural French.
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
