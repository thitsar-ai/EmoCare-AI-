import { loadEmoStorageBlocks } from './emoAnalytics';
import { buildPersonalContextItems } from './memoryLedger';

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

function buildChipLabel(recentCheckIns, journalEntries) {
  const parts = [];
  const latest = recentCheckIns[0];
  if (latest?.mood?.label) parts.push(latest.mood.label);
  if (journalEntries.length) parts.push(`${journalEntries.length} journal`);
  else if (recentCheckIns.length > 1) parts.push(`${recentCheckIns.length} check-ins`);
  if (!parts.length) return 'Your journey on this device';
  return parts.slice(0, 2).join(' · ');
}

/**
 * Level-2 RAG-lite: on-device check-ins, journal, memory ledger for Talk + Voice.
 * @param {string} [userName]
 * @returns {Promise<{ active: boolean; chipLabel: string | null; systemBlock: string }>}
 */
export async function loadEmoPersonalContext(userName) {
  const [{ checkIns, journalEntries }, contextItems] = await Promise.all([
    loadEmoStorageBlocks(),
    buildPersonalContextItems(userName),
  ]);

  const lines = [
    '## PERSONAL CONTEXT (private — on this device only)',
    'Use naturally when it helps you be present. Never say "according to my records", "your data shows", or paste this block.',
    'Do not quote journal entries verbatim unless the user asks. Honor psychological safety first.',
    '',
  ];

  let hasContent = false;

  const recentCheckIns = [...checkIns]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 7);
  if (recentCheckIns.length) {
    hasContent = true;
    lines.push('Recent check-ins:');
    for (const c of recentCheckIns) {
      const mood = c.mood?.label || 'Unlabeled';
      const note = c.note?.trim() ? ` — ${truncate(c.note, 90)}` : '';
      lines.push(`- ${formatShortDate(c.date)}: ${mood}${note}`);
    }
    lines.push('');
  }

  const recentJournal = [...journalEntries]
    .sort((a, b) => new Date(b.date) - new Date(b.date))
    .slice(0, 3);
  if (recentJournal.length) {
    hasContent = true;
    lines.push('Recent journal (themes only — treat as sacred):');
    for (const e of recentJournal) {
      const mood = e.mood?.label ? ` · mood ${e.mood.label}` : '';
      lines.push(`- ${formatShortDate(e.date)}${mood}: ${truncate(e.text, 180)}`);
    }
    lines.push('');
  }

  const ctxTexts = contextItems.filter((i) => i.id !== 'ctx-empty').map((i) => i.text);
  if (ctxTexts.length) {
    hasContent = true;
    lines.push('Gentle patterns Emo holds:');
    for (const t of ctxTexts) lines.push(`- ${t}`);
    lines.push('');
  }

  if (!hasContent) {
    return { active: false, chipLabel: null, systemBlock: '' };
  }

  return {
    active: true,
    chipLabel: buildChipLabel(recentCheckIns, journalEntries),
    systemBlock: lines.join('\n').trim(),
  };
}

/** @param {string} [userName] */
export async function buildEmoPersonalContextBlock(userName) {
  const { systemBlock } = await loadEmoPersonalContext(userName);
  return systemBlock;
}
