import { loadEmoStorageBlocks } from './emoAnalytics.js';
import { buildMemoryInjectionBlock } from './memoryInjection.js';
import { loadConfirmedUsableMemories } from './personalMemories.js';

function truncate(text, max) {
  const t = String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function formatShortDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * Chip: temporary feeling distinct from persistent memory count.
 * Example: "Feeling hopeful · 1 memory"
 */
function buildChipLabel(latestMoodLabel, memoryCount) {
  const parts = [];
  if (latestMoodLabel) {
    parts.push(`Feeling ${String(latestMoodLabel).toLowerCase()}`);
  }
  if (memoryCount > 0) {
    parts.push(memoryCount === 1 ? '1 memory' : `${memoryCount} memories`);
  }
  if (!parts.length) return null;
  return parts.join(' · ');
}

/**
 * @param {string} [userName]
 * @param {string} [userMessage] current user message for retrieval ranking
 */
export async function loadEmoPersonalContext(userName, userMessage = '') {
  const [{ checkIns }, injection, confirmed] = await Promise.all([
    loadEmoStorageBlocks(),
    buildMemoryInjectionBlock(userName, userMessage),
    loadConfirmedUsableMemories(),
  ]);

  const lines = [];
  let hasContent = false;

  if (injection.systemBlock) {
    hasContent = true;
    lines.push(injection.systemBlock);
    lines.push('');
  }

  const recentCheckIns = [...checkIns]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);
  const latest = recentCheckIns[0];
  if (latest?.mood?.label) {
    hasContent = true;
    lines.push('## TEMPORARY CHECK-IN CONTEXT (not persistent memory)');
    lines.push('Use: "You checked in as…" / "You wrote that…". Do NOT use "I remember…".');
    const note = latest.note?.trim() ? ` Note: ${truncate(latest.note, 80)}` : '';
    lines.push(
      `- Latest check-in (${formatShortDate(latest.date)}): feeling ${latest.mood.label}.${note}`,
    );
    lines.push(
      '- Temporary unless the user explicitly saved it as a confirmed memory.',
    );
    lines.push('');
  }

  if (!hasContent && userName?.trim()) {
    hasContent = true;
    lines.push(`## NAME (safe to use): ${userName.trim()}`);
  }

  const chipLabel = buildChipLabel(latest?.mood?.label, confirmed.length);

  if (!hasContent) {
    return {
      active: false,
      chipLabel: null,
      systemBlock: '',
      memory_ids_injected: [],
      categories_injected: [],
      injectedMemories: [],
    };
  }

  return {
    active: true,
    chipLabel,
    systemBlock: lines.join('\n').trim(),
    memory_ids_injected: injection.memory_ids_injected || [],
    categories_injected: injection.categories_injected || [],
    injectedMemories: injection.memories || [],
  };
}

/** @param {string} [userName] */
export async function buildEmoPersonalContextBlock(userName, userMessage = '') {
  const { systemBlock } = await loadEmoPersonalContext(userName, userMessage);
  return systemBlock;
}
