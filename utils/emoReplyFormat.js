/**
 * Polish model output for EmoCare chat — plain, spacious, no raw search artifacts.
 */
export function polishEmoReplyText(text) {
  if (!text) return '';

  let out = String(text)
    .replace(/```[\s\S]*?```/g, '')
    .replace(/^\s*\{[\s\S]*\}\s*$/m, '')
    .replace(/\*\*/g, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[\-*•]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\[(Tavily summary|Web search|Search result)[^\]]*\]\s*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Collapse single newlines inside paragraphs but keep paragraph breaks.
  out = out
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean)
    .join('\n\n');

  out = out.replace(/^(Hey|Hi|Hello)( there)?[,!\s—-]+/i, '').trim();

  return out;
}

/** Split polished reply into paragraphs for spaced typography in chat bubbles. */
export function splitEmoReplyParagraphs(text) {
  const polished = polishEmoReplyText(text);
  if (!polished) return [];
  return polished.split(/\n\s*\n/).filter(Boolean);
}
