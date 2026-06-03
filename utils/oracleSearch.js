import { emocareFetch, isTavilyConfigured } from './emocareApi';

/** @deprecated Keys live on the server. */
export function getTavilyApiKey() {
  return isTavilyConfigured() ? 'proxy' : '';
}

function normalizeQuery(text) {
  return text
    .trim()
    .replace(/^(please |can you |could you )?(search|look up|research|find out about)\s+/i, '')
    .replace(/\?+$/, '')
    .trim();
}

/** @returns {Promise<{ title: string, url: string, snippet: string }[]>} */
async function searchTavily(query) {
  if (!isTavilyConfigured()) return [];

  try {
    const res = await emocareFetch('/v1/oracle/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data.rows) ? data.rows : [];
  } catch {
    return [];
  }
}

/** @returns {Promise<{ title: string, url: string, snippet: string } | null>} */
async function searchWikipedia(query) {
  try {
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=1&format=json&origin=*`;
    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) return null;
    const [, titles, descriptions, urls] = await searchRes.json();
    if (!titles?.[0]) return null;
    return {
      title: titles[0],
      url: urls[0] || '',
      snippet: descriptions[0] || '',
    };
  } catch {
    return null;
  }
}

/** @returns {Promise<string | null>} */
async function searchDuckDuckGoAbstract(query) {
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&skip_disambig=1`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.AbstractText || data.RelatedTopics?.[0]?.Text;
    return text ? String(text).trim() : null;
  } catch {
    return null;
  }
}

function formatContextBlock(query, rows) {
  const lines = [
    '## ORACLE WEB RESEARCH (internal — synthesize for the user; never paste raw)',
    `Research query: ${query}`,
    '',
    'Instructions: Per EOS Search Integration Style — weave these findings into flowing, soulful prose with spacious paragraphs. Never paste raw snippets, JSON, markdown, bullet lists, or bracketed source tags. Synthesize calmly and note how key facts support the user\'s peace of mind or next step.',
    '',
  ];

  rows.forEach((row, index) => {
    const source = row.url ? `${row.title} (${row.url.replace(/^https?:\/\//, '').split('/')[0]})` : row.title;
    lines.push(`Finding ${index + 1} — ${source}`);
    lines.push(row.snippet);
    lines.push('');
  });

  return lines.join('\n').trim();
}

/**
 * Fetch web context for Oracle-mode chat replies.
 * @param {string} userMessage
 */
export async function fetchOracleResearchContext(userMessage) {
  const query = normalizeQuery(userMessage);
  if (!query || query.length < 3) {
    return { query: '', hadResults: false, sources: [], contextBlock: '' };
  }

  const rows = [];
  const tavilyRows = await searchTavily(query);
  rows.push(...tavilyRows);

  if (rows.length < 2) {
    const wiki = await searchWikipedia(query);
    if (wiki?.snippet) rows.push(wiki);
  }

  if (rows.length < 1) {
    const ddg = await searchDuckDuckGoAbstract(query);
    if (ddg) {
      rows.push({ title: 'Quick reference', url: '', snippet: ddg });
    }
  }

  const sources = rows
    .filter((r) => r.title)
    .map((r) => ({ title: r.title, url: r.url }));

  if (!rows.length) {
    return { query, hadResults: false, sources: [], contextBlock: '' };
  }

  return {
    query,
    hadResults: true,
    sources,
    contextBlock: formatContextBlock(query, rows),
  };
}

export function shouldRunOracleSearch(intentMode, userMessage) {
  if (intentMode !== 'oracle') return false;
  const q = normalizeQuery(userMessage || '');
  return q.length >= 3;
}
