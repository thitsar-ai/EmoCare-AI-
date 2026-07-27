import { loadEmoStorageBlocks } from './emoAnalytics.js';
import { buildMemoryInjectionBlock } from './memoryInjection.js';
import { loadConfirmedUsableMemories } from './personalMemories.js';
import { buildBurmeseChipLabel, getBurmeseCheckInContextHeader } from './emoBurmese.js';

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

/** @param {string} [moodLabel] */
function spanishFeelingPart(moodLabel) {
  const key = String(moodLabel || '')
    .trim()
    .toLowerCase();
  /** @type {Record<string, string>} */
  const map = {
    light: 'en calma',
    calm: 'en calma',
    peaceful: 'en paz',
    hopeful: 'con esperanza',
    grateful: 'agradecido/a',
    tired: 'cansado/a',
    anxious: 'ansioso/a',
    sad: 'triste',
    stressed: 'estresado/a',
    happy: 'feliz',
  };
  return map[key] || String(moodLabel || '').toLowerCase();
}

function buildSpanishChipLabel(latestMoodLabel, memoryCount) {
  const parts = [];
  if (latestMoodLabel) {
    parts.push(`Te sientes ${spanishFeelingPart(latestMoodLabel)}`);
  }
  if (memoryCount > 0) {
    parts.push(memoryCount === 1 ? '1 recuerdo' : `${memoryCount} recuerdos`);
  }
  if (!parts.length) return null;
  return parts.join(' · ');
}

/** @param {string} [moodLabel] */
function indonesianFeelingPart(moodLabel) {
  const key = String(moodLabel || '')
    .trim()
    .toLowerCase();
  /** @type {Record<string, string>} */
  const map = {
    light: 'lebih ringan',
    calm: 'tenang',
    peaceful: 'damai',
    hopeful: 'penuh harapan',
    grateful: 'bersyukur',
    tired: 'lelah',
    anxious: 'cemas',
    sad: 'sedih',
    stressed: 'stres',
    happy: 'bahagia',
  };
  return map[key] || String(moodLabel || '').toLowerCase();
}

function buildIndonesianChipLabel(latestMoodLabel, memoryCount) {
  const parts = [];
  if (latestMoodLabel) {
    const feeling = indonesianFeelingPart(latestMoodLabel);
    parts.push(
      String(latestMoodLabel).trim().toLowerCase() === 'light'
        ? 'Merasa lebih ringan'
        : `Merasa ${feeling}`,
    );
  }
  if (memoryCount > 0) {
    parts.push(memoryCount === 1 ? '1 kenangan' : `${memoryCount} kenangan`);
  }
  if (!parts.length) return null;
  return parts.join(' · ');
}

/** @param {string} [moodLabel] */
function portugueseFeelingPart(moodLabel) {
  const key = String(moodLabel || '')
    .trim()
    .toLowerCase();
  /** @type {Record<string, string>} */
  const map = {
    light: 'mais leve',
    calm: 'em paz',
    peaceful: 'em paz',
    heavy: 'com o coração pesado',
    hopeful: 'esperançosa',
    grateful: 'grata',
    tired: 'cansada',
    anxious: 'ansiosa',
    overwhelmed: 'sobrecarregada',
    sad: 'triste',
    stressed: 'estressada',
    happy: 'alegre',
    joyful: 'alegre',
    present: 'presente',
  };
  return map[key] || String(moodLabel || '').toLowerCase();
}

function buildPortugueseChipLabel(latestMoodLabel, memoryCount) {
  const parts = [];
  if (latestMoodLabel) {
    const key = String(latestMoodLabel).trim().toLowerCase();
    parts.push(
      key === 'light'
        ? 'Sentindo-se mais leve'
        : key === 'peaceful' || key === 'calm'
          ? 'Sentindo-se em paz'
          : `Sentindo-se ${portugueseFeelingPart(latestMoodLabel)}`,
    );
  }
  if (memoryCount > 0) {
    parts.push(memoryCount === 1 ? '1 lembrança' : `${memoryCount} lembranças`);
  }
  if (!parts.length) return null;
  return parts.join(' · ');
}

/** @param {string} [moodLabel] */
function frenchFeelingPart(moodLabel) {
  const key = String(moodLabel || '')
    .trim()
    .toLowerCase();
  /** @type {Record<string, string>} */
  const map = {
    light: 'mieux',
    calm: 'en paix',
    peaceful: 'en paix',
    heavy: 'le cœur lourd',
    hopeful: 'plein·e d’espoir',
    grateful: 'reconnaissant·e',
    tired: 'fatigué·e',
    anxious: 'anxieux·se',
    overwhelmed: 'dépassé·e',
    sad: 'triste',
    stressed: 'stressé·e',
    happy: 'joyeux·se',
    joyful: 'joyeux·se',
    present: 'présent·e',
  };
  return map[key] || String(moodLabel || '').toLowerCase();
}

function buildFrenchChipLabel(latestMoodLabel, memoryCount) {
  const parts = [];
  if (latestMoodLabel) {
    const key = String(latestMoodLabel).trim().toLowerCase();
    parts.push(
      key === 'light'
        ? 'Vous vous sentez mieux'
        : key === 'peaceful' || key === 'calm'
          ? 'Vous vous sentez en paix'
          : `Vous vous sentez ${frenchFeelingPart(latestMoodLabel)}`,
    );
  }
  if (memoryCount > 0) {
    parts.push(memoryCount === 1 ? '1 souvenir' : `${memoryCount} souvenirs`);
  }
  if (!parts.length) return null;
  return parts.join(' · ');
}

/**
 * @param {string} [userName]
 * @param {string} [userMessage] current user message for retrieval ranking
 * @param {{ burmese?: boolean; locale?: 'en' | 'my' | 'es' | 'id' | 'pt-BR' | 'fr' }} [opts]
 */
export async function loadEmoPersonalContext(userName, userMessage = '', opts = {}) {
  const burmese = Boolean(opts.burmese) || opts.locale === 'my';
  const locale = opts.locale || (burmese ? 'my' : 'en');
  const [{ checkIns }, injection, confirmed] = await Promise.all([
    loadEmoStorageBlocks(),
    buildMemoryInjectionBlock(userName, userMessage, { burmese }),
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
    if (burmese) {
      lines.push(getBurmeseCheckInContextHeader());
    } else {
      lines.push('## TEMPORARY CHECK-IN CONTEXT (not persistent memory)');
      lines.push('Use: "You checked in as…" / "You wrote that…". Do NOT use "I remember…".');
      if (locale === 'pt-BR') {
        lines.push(
          'Express mood in Brazilian Portuguese with gender-neutral phrasing when possible (e.g. “Hoje você registrou que está se sentindo em paz.”). Never expose raw English mood keys.',
        );
      } else if (locale === 'fr') {
        lines.push(
          'Express mood in French with gender-neutral phrasing when possible (e.g. “Vous avez indiqué vous sentir en paix aujourd’hui.”). Never expose raw English mood keys.',
        );
      }
    }
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

  let chipLabel = buildChipLabel(latest?.mood?.label, confirmed.length);
  if (locale === 'my') chipLabel = buildBurmeseChipLabel(latest?.mood?.label, confirmed.length);
  else if (locale === 'es') chipLabel = buildSpanishChipLabel(latest?.mood?.label, confirmed.length);
  else if (locale === 'id') chipLabel = buildIndonesianChipLabel(latest?.mood?.label, confirmed.length);
  else if (locale === 'pt-BR') chipLabel = buildPortugueseChipLabel(latest?.mood?.label, confirmed.length);
  else if (locale === 'fr') chipLabel = buildFrenchChipLabel(latest?.mood?.label, confirmed.length);

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
