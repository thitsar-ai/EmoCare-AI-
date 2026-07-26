/**
 * Privacy-preserving memory diagnostics.
 * Never logs full memory text, user messages, or model prompts by default.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const MEMORY_DIAGNOSTICS_KEY = 'emoMemoryDiagnostics';
const MAX_EVENTS = 80;
const RETENTION_MS = 14 * 24 * 60 * 60 * 1000;

function parseList(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * @param {{
 *   type: string;
 *   sessionId?: string;
 *   memory_ids_injected?: string[];
 *   memory_ids_used?: string[];
 *   categories_injected?: string[];
 *   recall_phrase_detected?: boolean;
 *   validation_passed?: boolean | null;
 *   classifier_parse_ok?: boolean | null;
 *   dedup_result?: string | null;
 *   prompt_outcome?: 'shown' | 'discarded' | 'accepted' | 'declined' | null;
 * }} event
 */
export async function logMemoryDiagnostic(event) {
  try {
    const raw = await AsyncStorage.getItem(MEMORY_DIAGNOSTICS_KEY);
    const list = parseList(raw);
    const entry = {
      ts: new Date().toISOString(),
      type: event.type || 'event',
      sessionId: event.sessionId || null,
      memory_ids_injected: event.memory_ids_injected || [],
      memory_ids_used: event.memory_ids_used || [],
      categories_injected: event.categories_injected || [],
      recall_phrase_detected: Boolean(event.recall_phrase_detected),
      validation_passed: event.validation_passed ?? null,
      classifier_parse_ok: event.classifier_parse_ok ?? null,
      dedup_result: event.dedup_result ?? null,
      prompt_outcome: event.prompt_outcome ?? null,
    };
    list.unshift(entry);
    const cutoff = Date.now() - RETENTION_MS;
    const pruned = list
      .filter((e) => {
        const t = Date.parse(e.ts || '');
        return !Number.isFinite(t) || t >= cutoff;
      })
      .slice(0, MAX_EVENTS);
    await AsyncStorage.setItem(MEMORY_DIAGNOSTICS_KEY, JSON.stringify(pruned));
  } catch (err) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[memoryDiagnostics]', err?.message || err);
    }
  }
}

export async function removeDiagnosticsForMemoryId(memoryId) {
  if (!memoryId) return;
  try {
    const raw = await AsyncStorage.getItem(MEMORY_DIAGNOSTICS_KEY);
    const list = parseList(raw);
    const next = list.map((e) => ({
      ...e,
      memory_ids_injected: (e.memory_ids_injected || []).filter((id) => id !== memoryId),
      memory_ids_used: (e.memory_ids_used || []).filter((id) => id !== memoryId),
    }));
    await AsyncStorage.setItem(MEMORY_DIAGNOSTICS_KEY, JSON.stringify(next));
  } catch {}
}

export async function clearMemoryDiagnostics() {
  await AsyncStorage.removeItem(MEMORY_DIAGNOSTICS_KEY);
}
