/**
 * Locale-aware text metrics — especially Myanmar Unicode (no top clipping).
 *
 * Myanmar / Burmese glyphs have tall ascenders and stacked diacritics. Tight
 * lineHeight (common with Latin UI) and Georgia/serif fonts clip those marks
 * on iOS. Prefer system fonts + taller line metrics whenever Myanmar is shown.
 *
 * Pure JS — safe to import from Node smoke tests (no react-native runtime).
 */

import { containsMyanmarScript } from './emoBurmese.js';

export { containsMyanmarScript };

/** When true, all UI Text/TextInput get Myanmar-safe metrics (UI locale === my). */
let myanmarUiActive = false;

export function setMyanmarUiActive(active) {
  myanmarUiActive = Boolean(active);
}

export function isMyanmarUiActive() {
  return myanmarUiActive;
}

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

const CLIPPING_FONTS = /georgia|serif|times|palatino|courier|baskerville|didot|bodoni/i;

/** Shallow StyleSheet.flatten without importing react-native (Node-safe). */
function flattenStyle(style) {
  if (style == null || typeof style === 'boolean') return {};
  if (Array.isArray(style)) {
    return style.reduce((acc, item) => Object.assign(acc, flattenStyle(item)), {});
  }
  if (typeof style === 'object') return { ...style };
  return {};
}

/**
 * Flatten + rewrite a Text/TextInput style so Myanmar ascenders are not clipped.
 * Safe to apply for any style when UI locale is Myanmar or the string is Myanmar.
 * @param {unknown} style
 */
export function applyMyanmarUiStyle(style) {
  const flat = flattenStyle(style);
  const fontSize = typeof flat.fontSize === 'number' ? flat.fontSize : 15;
  // 1.72–1.85× keeps stacked marks inside the line box on iOS.
  const minLineHeight = Math.ceil(fontSize * 1.78);
  if (typeof flat.lineHeight !== 'number' || flat.lineHeight < minLineHeight) {
    flat.lineHeight = minLineHeight;
  }
  // Georgia / serif metrics do not reserve Myanmar headroom — use system UI font.
  if (!flat.fontFamily || CLIPPING_FONTS.test(String(flat.fontFamily))) {
    delete flat.fontFamily;
  }
  // Tracking breaks Myanmar stacked marks — always zero letter-spacing.
  flat.letterSpacing = 0;
  const minPadTop = Math.max(3, Math.round(fontSize * 0.2));
  flat.paddingTop = Math.max(Number(flat.paddingTop) || 0, minPadTop);
  // Slight bottom room so descenders/marks are not flush against the clip edge.
  flat.paddingBottom = Math.max(Number(flat.paddingBottom) || 0, Math.round(fontSize * 0.06));
  // Harmless on iOS; helps Android glyph padding.
  flat.includeFontPadding = true;
  return flat;
}

/**
 * Pull plain text from React children for script detection.
 * @param {unknown} children
 * @returns {string}
 */
export function extractRenderableText(children) {
  if (children == null || typeof children === 'boolean') return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(extractRenderableText).join('');
  if (typeof children === 'object' && children.props) {
    return extractRenderableText(children.props.children);
  }
  return '';
}
