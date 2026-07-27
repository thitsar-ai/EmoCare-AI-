/**
 * Locale-aware text metrics — especially Myanmar Unicode (no top clipping).
 */

import { containsMyanmarScript } from './emoBurmese.js';

export { containsMyanmarScript };

/**
 * @param {unknown} text
 */
export function textNeedsMyanmarMetrics(text) {
  return containsMyanmarScript(text);
}

/**
 * Extra vertical room for Myanmar stacked glyphs / diacritics.
 * @param {unknown} text
 * @param {{ fontSize?: number; englishLineHeight?: number; englishPaddingV?: number }} [opts]
 */
export function localeTextMetrics(text, opts = {}) {
  const fontSize = opts.fontSize ?? 15;
  const myanmar = textNeedsMyanmarMetrics(text);
  if (!myanmar) {
    return {
      myanmar: false,
      fontSize,
      lineHeight: opts.englishLineHeight ?? Math.round(fontSize * 1.55),
      paddingVertical: opts.englishPaddingV ?? 12,
      paddingTop: opts.englishPaddingV ?? 12,
      paddingBottom: opts.englishPaddingV ?? 12,
      /** Prefer system font for Myanmar; leave undefined to keep parent font for Latin. */
      fontFamily: undefined,
      includeFontPadding: true,
    };
  }
  return {
    myanmar: true,
    fontSize,
    lineHeight: Math.round(fontSize * 1.85),
    paddingVertical: Math.max(16, (opts.englishPaddingV ?? 12) + 6),
    paddingTop: Math.max(18, (opts.englishPaddingV ?? 12) + 8),
    paddingBottom: Math.max(14, (opts.englishPaddingV ?? 12) + 4),
    fontFamily: undefined,
    includeFontPadding: true,
  };
}

/**
 * Style patch for React Native Text when content may include Myanmar.
 * @param {unknown} text
 * @param {{ fontSize?: number; color?: string; englishLineHeight?: number; baseFontFamily?: string }} [opts]
 */
export function localeAwareTextStyle(text, opts = {}) {
  const m = localeTextMetrics(text, {
    fontSize: opts.fontSize,
    englishLineHeight: opts.englishLineHeight,
  });
  return {
    fontSize: m.fontSize,
    lineHeight: m.lineHeight,
    ...(m.myanmar
      ? { fontFamily: undefined }
      : opts.baseFontFamily
        ? { fontFamily: opts.baseFontFamily }
        : {}),
  };
}
