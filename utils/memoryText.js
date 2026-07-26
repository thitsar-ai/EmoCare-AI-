/** Normalization, similarity, and safe escaping for memory text. */

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'to',
  'of',
  'in',
  'on',
  'for',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'am',
  'i',
  'me',
  'my',
  'you',
  'your',
  'that',
  'this',
  'it',
  'with',
  'when',
  'as',
  'at',
]);

export function normalizeMemoryCompareText(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function memoryTokens(text) {
  return normalizeMemoryCompareText(text)
    .split(' ')
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

function sequenceRatio(s1, s2) {
  const a = String(s1 || '');
  const b = String(s2 || '');
  if (!a && !b) return 100;
  if (!a || !b) return 0;
  if (a === b) return 100;
  const la = a.length;
  const lb = b.length;
  const dp = Array.from({ length: la + 1 }, () => new Array(lb + 1).fill(0));
  for (let i = 0; i <= la; i += 1) dp[i][0] = i;
  for (let j = 0; j <= lb; j += 1) dp[0][j] = j;
  for (let i = 1; i <= la; i += 1) {
    for (let j = 1; j <= lb; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  const dist = dp[la][lb];
  return ((la + lb - dist) / (la + lb)) * 100;
}

/**
 * token_set_ratio-style similarity 0–100 (fuzzywuzzy-compatible idea).
 * ≥85 treats as near-duplicate per v1.1 spec.
 */
export function tokenSetRatio(a, b) {
  const ta = [...new Set(memoryTokens(a))];
  const tb = [...new Set(memoryTokens(b))];
  if (!ta.length || !tb.length) {
    return sequenceRatio(normalizeMemoryCompareText(a), normalizeMemoryCompareText(b));
  }
  const setA = new Set(ta);
  const setB = new Set(tb);
  const intersection = [...setA].filter((t) => setB.has(t)).sort();
  const diffA = [...setA].filter((t) => !setB.has(t)).sort();
  const diffB = [...setB].filter((t) => !setA.has(t)).sort();
  const sortedInter = intersection.join(' ');
  const combinedA = [...intersection, ...diffA].join(' ');
  const combinedB = [...intersection, ...diffB].join(' ');
  return Math.max(
    sequenceRatio(sortedInter, combinedA),
    sequenceRatio(sortedInter, combinedB),
    sequenceRatio(combinedA, combinedB),
  );
}

export const MEMORY_DEDUP_THRESHOLD = 85;

export function isNearDuplicateMemory(a, b, threshold = MEMORY_DEDUP_THRESHOLD) {
  return tokenSetRatio(a, b) >= threshold;
}

/** Escape memory text for safe prompt injection (untrusted data). */
export function escapeMemoryForPrompt(text) {
  return String(text || '')
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    .replace(/<\/?USER_APPROVED_MEMORIES>/gi, '')
    .replace(/<\/?MEMORY\b[^>]*>/gi, '')
    .replace(/\[\/?MEMORY[^\]]*\]/gi, '')
    .replace(/\b(SYSTEM|DEVELOPER|ASSISTANT|USER)\s*:/gi, '($1)')
    .replace(/```/g, "'''")
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 200);
}

export function finishFirstPersonMemory(text) {
  let t = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^["']|["']$/g, '');
  if (!t) return '';
  t = t.charAt(0).toUpperCase() + t.slice(1);
  if (!/[.!?]$/.test(t)) t = `${t}.`;
  return t.slice(0, 120);
}
