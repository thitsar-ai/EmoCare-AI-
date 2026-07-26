/**
 * Post-response fabrication / attribution guard for persistent recall language.
 */

import { memoryTokens, normalizeMemoryCompareText } from './memoryText.js';

const RECALL_PHRASES = [
  /\bi remember\b/i,
  /\byou shared before\b/i,
  /\blast time,?\s+you told me\b/i,
  /\byou previously told me\b/i,
  /\byou told me before\b/i,
];

const SAFE_FALLBACK =
  "I'm here with you. Tell me more about what's going on — I'll listen.";

export function detectPersistentRecallPhrase(text) {
  const t = String(text || '');
  return RECALL_PHRASES.some((re) => re.test(t));
}

function supportScore(response, memoryText) {
  const respTokens = new Set(memoryTokens(response));
  const memTokens = memoryTokens(memoryText);
  if (!memTokens.length) return 0;
  let hit = 0;
  for (const t of memTokens) if (respTokens.has(t)) hit += 1;
  return hit / memTokens.length;
}

/**
 * Infer which injected memories were used by lexical overlap.
 * @param {string} response
 * @param {{ id: string; text: string }[]} injectedMemories
 */
export function inferMemoryIdsUsed(response, injectedMemories) {
  const used = [];
  for (const m of injectedMemories || []) {
    if (supportScore(response, m.text) >= 0.34) used.push(m.id);
  }
  // Prefer single best match
  if (used.length > 1) {
    let best = used[0];
    let bestScore = 0;
    for (const id of used) {
      const mem = injectedMemories.find((m) => m.id === id);
      const s = supportScore(response, mem?.text || '');
      if (s > bestScore) {
        bestScore = s;
        best = id;
      }
    }
    return [best];
  }
  return used;
}

/**
 * Validate recall attribution.
 * @param {{
 *   response: string;
 *   memory_ids_injected?: string[];
 *   injectedMemories?: Array<{ id: string; text: string }>;
 *   memory_ids_used?: string[];
 * }} args
 * @returns {{
 *   ok: boolean;
 *   response: string;
 *   memory_ids_used: string[];
 *   recall_phrase_detected: boolean;
 *   reason?: string;
 * }}
 */
export function validateMemoryRecallResponse(args) {
  const response = args?.response;
  const memory_ids_injected = /** @type {string[]} */ (args?.memory_ids_injected || []);
  const injectedMemories = /** @type {Array<{ id: string; text: string }>} */ (
    args?.injectedMemories || []
  );
  const claimedUsed = args?.memory_ids_used;
  const text = String(response || '').trim();
  const recall_phrase_detected = detectPersistentRecallPhrase(text);
  const injectedSet = new Set(memory_ids_injected);

  let memory_ids_used = Array.isArray(claimedUsed)
    ? claimedUsed.filter(Boolean)
    : inferMemoryIdsUsed(text, injectedMemories);

  memory_ids_used = memory_ids_used.filter((id) => injectedSet.has(id));

  if (!recall_phrase_detected) {
    return {
      ok: true,
      response: text,
      memory_ids_used: [],
      recall_phrase_detected: false,
    };
  }

  if (!memory_ids_injected.length || !memory_ids_used.length) {
    return {
      ok: false,
      response: SAFE_FALLBACK,
      memory_ids_used: [],
      recall_phrase_detected: true,
      reason: 'recall_without_injected_memory',
    };
  }

  for (const id of memory_ids_used) {
    if (!injectedSet.has(id)) {
      return {
        ok: false,
        response: SAFE_FALLBACK,
        memory_ids_used: [],
        recall_phrase_detected: true,
        reason: 'unknown_memory_id',
      };
    }
  }

  // Relationship / name distortion check (sister vs friend)
  const usedMems = injectedMemories.filter((m) => memory_ids_used.includes(m.id));
  for (const m of usedMems) {
    const mem = normalizeMemoryCompareText(m.text);
    const resp = normalizeMemoryCompareText(text);
    if (mem.includes('sister') && resp.includes('friend') && !resp.includes('sister')) {
      return {
        ok: false,
        response: SAFE_FALLBACK,
        memory_ids_used: [],
        recall_phrase_detected: true,
        reason: 'relationship_distortion',
      };
    }
    if (supportScore(text, m.text) < 0.2) {
      return {
        ok: false,
        response: SAFE_FALLBACK,
        memory_ids_used: [],
        recall_phrase_detected: true,
        reason: 'unsupported_recall',
      };
    }
  }

  return {
    ok: true,
    response: text,
    memory_ids_used,
    recall_phrase_detected: true,
  };
}

export function stripPersistentRecallClaims(text) {
  return String(text || '')
    .replace(/\bI remember[^.?!]*[.?!]?\s*/gi, '')
    .replace(/\bYou shared before[^.?!]*[.?!]?\s*/gi, '')
    .replace(/\bLast time,?\s+you told me[^.?!]*[.?!]?\s*/gi, '')
    .trim() || SAFE_FALLBACK;
}
