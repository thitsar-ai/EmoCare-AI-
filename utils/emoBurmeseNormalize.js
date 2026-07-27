/**
 * Myanmar Unicode normalization helpers — never Zawgyi conversion here.
 */

/**
 * NFC normalize Burmese text and tidy whitespace without breaking clusters.
 * @param {unknown} text
 */
export function normalizeBurmeseText(text) {
  let s = String(text || '');
  try {
    s = s.normalize('NFC');
  } catch {
    /* older JS engines */
  }
  // Collapse excessive blank lines; keep paragraph breaks
  s = s.replace(/\r\n/g, '\n').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n');
  // Trim edges only — do not strip mid-grapheme
  return s.trim();
}

/**
 * Heuristic: too many ရှင် endings often signals mechanical particle spam.
 * @param {string} text
 */
export function countBurmeseHonorificDensity(text) {
  const s = String(text || '');
  const sentences = s.split(/[။!?]/).filter((x) => x.trim().length > 2);
  if (!sentences.length) return 0;
  const withShin = sentences.filter((x) => /ရှင်|ရှင့်|ပါရှင်/.test(x)).length;
  return withShin / sentences.length;
}
