import { loadEmoStorageBlocks } from './emoAnalytics';
import { loadConfirmedUsableMemories, PERSONAL_MEMORY_CATEGORIES } from './personalMemories';

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

function buildChipLabel(recentCheckIns, journalEntries, personalCount) {
  const parts = [];
  if (personalCount > 0) parts.push(`${personalCount} remembered`);
  const latest = recentCheckIns[0];
  if (latest?.mood?.label) parts.push(latest.mood.label);
  if (journalEntries.length) parts.push(`${journalEntries.length} journal`);
  else if (recentCheckIns.length > 1) parts.push(`${recentCheckIns.length} check-ins`);
  if (!parts.length) return 'Your journey on this device';
  return parts.slice(0, 2).join(' · ');
}

/**
 * Level-2 RAG-lite with memory trust tiers.
 * Confirmed memories may use "I remember…"; everything else is soft or omitted.
 * @param {string} [userName]
 * @returns {Promise<{ active: boolean; chipLabel: string | null; systemBlock: string }>}
 */
export async function loadEmoPersonalContext(userName) {
  const [{ checkIns, journalEntries }, confirmedMemories] = await Promise.all([
    loadEmoStorageBlocks(),
    loadConfirmedUsableMemories(),
  ]);

  const lines = [
    '## MEMORY TRUST RULES (critical — follow exactly)',
    'Only say "I remember you told me…", "I remember you mentioned…", or similar CONFIDENT recall for items listed under CONFIRMED MEMORIES.',
    'Never invent names, relationships, or preferences. Never confidently recall something that is not in CONFIRMED MEMORIES.',
    'For TEMPORARY SESSION CONTEXT: do not say "I remember". If useful, soft phrasing only: "You previously shared something about…" or "I may be remembering this incorrectly, but did you mention…?" — usually prefer omitting uncertain details rather than asking for correction.',
    'Check-In mood/note is temporary session context unless the user later saved it as a confirmed memory.',
    'Use at most ONE memory detail per reply. Do not stack memories. Do not quote journal entries verbatim unless asked.',
    'Never say "according to my records", "your data shows", or claim closeness the user did not define.',
    'Never re-summarize a summary into a new "fact". Prefer the short confirmed fact text as written.',
    '',
  ];

  let hasContent = false;

  if (confirmedMemories.length) {
    hasContent = true;
    lines.push('## CONFIRMED MEMORIES (user-approved — confident "I remember…" allowed)');
    for (const m of confirmedMemories.slice(0, 12)) {
      const catLabel =
        PERSONAL_MEMORY_CATEGORIES.find((c) => c.id === m.category)?.label || 'Memory';
      const date = formatShortDate(m.date);
      lines.push(`- Fact: ${truncate(m.text, 160)}`);
      lines.push(`  Category: ${catLabel}${date ? ` · Saved: ${date}` : ''}`);
      if (m.sourceText && m.sourceText !== m.text) {
        lines.push(`  Source text: ${truncate(m.sourceText, 120)}`);
      }
    }
    lines.push('');
  }

  const recentCheckIns = [...checkIns]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);
  const latest = recentCheckIns[0];
  if (latest?.mood?.label) {
    hasContent = true;
    lines.push('## TEMPORARY SESSION CONTEXT (not confirmed memory — soft language only, or omit)');
    const note = latest.note?.trim() ? ` Note: ${truncate(latest.note, 80)}` : '';
    lines.push(
      `- Latest check-in (${formatShortDate(latest.date)}): feeling ${latest.mood.label}.${note}`,
    );
    lines.push(
      '- This check-in is temporary. Do not treat it as a lasting personal fact unless it appears under CONFIRMED MEMORIES.',
    );
    lines.push('');
  }

  // Soft journal themes: omit by default for trust. Include at most one truncated theme if present.
  const recentJournal = [...journalEntries]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 1);
  if (recentJournal[0]?.text?.trim() && confirmedMemories.length === 0) {
    hasContent = true;
    lines.push('## SOFT CONTEXT (usually omit — never use "I remember…")');
    lines.push(
      `- Recent journal theme (${formatShortDate(recentJournal[0].date)}): ${truncate(recentJournal[0].text, 100)}`,
    );
    lines.push(
      '- If you reference this, use uncertain phrasing or skip it. Prefer asking rather than asserting.',
    );
    lines.push('');
  }

  const name = userName?.trim();
  if (name) {
    hasContent = true;
    lines.push(`## NAME (safe to use): ${name}`);
    lines.push('');
  }

  if (!hasContent) {
    return { active: false, chipLabel: null, systemBlock: '' };
  }

  return {
    active: true,
    chipLabel: buildChipLabel(recentCheckIns, journalEntries, confirmedMemories.length),
    systemBlock: lines.join('\n').trim(),
  };
}

/** @param {string} [userName] */
export async function buildEmoPersonalContextBlock(userName) {
  const { systemBlock } = await loadEmoPersonalContext(userName);
  return systemBlock;
}
