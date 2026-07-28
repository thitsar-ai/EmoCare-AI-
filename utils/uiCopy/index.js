/**
 * EmoCare UI localization — catalogs + helpers.
 *
 * LANGUAGE_MODEL_DOC (see export below):
 * App UI + reminder language = chatLanguage (Settings → Emo language).
 * Talk compose follows chatLanguage; Mira follows miraLanguage independently.
 */

import catalogEn from './catalog.en.js';
import catalogMy from './catalog.my.js';
import catalogId from './catalog.id.js';
import catalogEs from './catalog.es.js';
import catalogPtBR from './catalog.pt-BR.js';
import catalogFr from './catalog.fr.js';

/** @typedef {'en' | 'my' | 'id' | 'es' | 'pt-BR' | 'fr'} UiLocale */

/** @type {readonly UiLocale[]} */
export const UI_LOCALES = Object.freeze(['en', 'my', 'id', 'es', 'pt-BR', 'fr']);

/**
 * App UI + reminder language follows chatLanguage (Settings → Emo language).
 * Talk compose follows chatLanguage. Mira follows miraLanguage independently.
 * Auto / unknown chatLanguage resolves to English UI.
 */
export const LANGUAGE_MODEL_DOC = [
  'App UI language and daily-reminder copy follow chatLanguage (Settings → Emo language).',
  'Talk compose / reply language follows chatLanguage.',
  'Mira reply language follows miraLanguage and is independent of chatLanguage.',
  'When chatLanguage is "auto" or unknown, UI copy falls back to English (en).',
].join(' ');

/** @type {Record<UiLocale, Record<string, string>>} */
const CATALOGS = {
  en: catalogEn,
  my: catalogMy,
  id: catalogId,
  es: catalogEs,
  'pt-BR': catalogPtBR,
  fr: catalogFr,
};

/**
 * Map a chatLanguage preference (or any locale-like string) to a UI locale.
 * auto / unknown → 'en'
 *
 * @param {unknown} chatLanguage
 * @returns {UiLocale}
 */
export function resolveUiLocale(chatLanguage) {
  if (chatLanguage == null) return 'en';
  const raw = String(chatLanguage).trim();
  if (!raw || raw === 'auto') return 'en';

  const lower = raw.toLowerCase();
  if (lower === 'en' || lower.startsWith('en-') || lower.startsWith('en_')) return 'en';
  if (lower === 'my' || lower.startsWith('my-') || lower.startsWith('my_') || lower === 'burmese') {
    return 'my';
  }
  if (lower === 'id' || lower.startsWith('id-') || lower.startsWith('id_') || lower === 'indonesian') {
    return 'id';
  }
  if (lower === 'es' || lower.startsWith('es-') || lower.startsWith('es_') || lower === 'spanish') {
    return 'es';
  }
  if (
    lower === 'pt-br' ||
    lower === 'pt_br' ||
    lower === 'ptbr' ||
    lower === 'pt' ||
    lower.startsWith('pt-') ||
    lower.startsWith('pt_')
  ) {
    return 'pt-BR';
  }
  if (lower === 'fr' || lower.startsWith('fr-') || lower.startsWith('fr_') || lower === 'french') {
    return 'fr';
  }

  return 'en';
}

/**
 * Merged catalog for a locale with English fallback per key.
 *
 * @param {unknown} locale
 * @returns {Record<string, string>}
 */
export function getUiCopy(locale) {
  const id = resolveUiLocale(locale);
  if (id === 'en') return { ...catalogEn };
  const localized = CATALOGS[id] || {};
  /** @type {Record<string, string>} */
  const merged = { ...catalogEn };
  for (const [key, value] of Object.entries(localized)) {
    if (typeof value === 'string' && value.length > 0) {
      merged[key] = value;
    }
  }
  return merged;
}

/**
 * Replace `{name}`-style placeholders in a template.
 *
 * @param {string} template
 * @param {Record<string, string | number> | null | undefined} vars
 */
function applyVars(template, vars) {
  if (!vars || typeof template !== 'string') return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    if (Object.prototype.hasOwnProperty.call(vars, name) && vars[name] != null) {
      return String(vars[name]);
    }
    return match;
  });
}

/**
 * Look up a UI string. Falls back to English, then the key itself.
 *
 * @param {unknown} locale
 * @param {string} key
 * @param {Record<string, string | number>} [vars]
 * @returns {string}
 */
export function t(locale, key, vars) {
  const id = resolveUiLocale(locale);
  const catalog = CATALOGS[id] || catalogEn;
  let value = catalog[key];
  if (typeof value !== 'string' || !value) {
    value = catalogEn[key];
  }
  if (typeof value !== 'string' || !value) {
    return key;
  }
  return applyVars(value, vars);
}

/**
 * Sorted list of all English catalog keys (source of truth).
 *
 * @returns {string[]}
 */
export function listUiKeys() {
  return Object.keys(catalogEn).sort();
}

/**
 * Keys present in English but missing or empty in each other locale.
 *
 * @returns {Record<Exclude<UiLocale, 'en'>, string[]>}
 */
export function getMissingKeysByLocale() {
  const keys = listUiKeys();
  /** @type {Record<string, string[]>} */
  const missing = {};
  for (const locale of UI_LOCALES) {
    if (locale === 'en') continue;
    const catalog = CATALOGS[locale] || {};
    missing[locale] = keys.filter((key) => {
      const value = catalog[key];
      return typeof value !== 'string' || value.length === 0;
    });
  }
  return /** @type {Record<Exclude<UiLocale, 'en'>, string[]>} */ (missing);
}
