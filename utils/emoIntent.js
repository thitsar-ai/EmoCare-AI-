const SANCTUARY_INTENT_PATTERNS = [
  /\bi feel\b/i, /\bi'm feeling\b/i, /\bim feeling\b/i,
  /\bfeeling (overwhelmed|anxious|sad|lonely|heavy|lost|empty|numb|scared|stuck|broken)\b/i,
  /\b(overwhelmed|heartbroken|burned out|burnout|meltdown)\b/i,
  /\b(validate|venting|just need to talk|hold space)\b/i,
  /\b(journal|journaling|reflect on my feelings|private reflection)\b/i,
  /\b(calm me down|slow down|ground me|breathe with me|help me feel)\b/i,
  /\bi (can't|cannot) (cope|handle|deal with|take this)\b/i,
  /\b(feel alone|so lonely|no one understands)\b/i,
  /\b(crying|cried|in tears)\b/i,
  /\bmy (anxiety|depression|grief|trauma|heart)\b/i,
  /\bhow am i doing\b/i,
  /\b(check.?in with myself|sanctuary|just (want|needed) to share)\b/i,
];

const ORACLE_INTENT_PATTERNS = [
  /\b(search|look up|find out|google|research|web search)\b/i,
  /\b(latest|current events?|today's|breaking news|news about|trends?)\b/i,
  /\b(who is|what is|where is|when did|how many|how much|tell me about)\b/i,
  /\b(analyze|analysis|compare|versus|vs\.?|pros and cons|break down|evaluate)\b/i,
  /\b(summarize|summary|explain|definition|define|walk me through)\b/i,
  /\b(economic|economy|market|stock|technology|artificial intelligence|global|geopolit)\b/i,
  /\b(plan my day|schedule|prioriti|organize|task list|to-?do)\b/i,
  /\b(linkedin|company profile|website|biography)\b/i,
  /\b(recommend|best .+ for|top \d+|guide to|tips for)\b/i,
  /\b(study|studies|research shows|data on|statistics|report on)\b/i,
  /\b(draft|write me|brainstorm|decide between)\b/i,
  /\b(medication|medicine|otc|over.?the.?counter|supplement)\b/i,
  /\b[A-Z][a-z]+(?:\s+[A-Z][a-zA-Z&.-]+)+\b/,
];

/** @returns {{ mode: 'sanctuary' | 'oracle', reason: string }} */
export function classifyEmoIntent(message) {
  const m = message.trim();
  if (m.length < 3) return { mode: 'sanctuary', reason: 'too_short' };
  if (/^\[Shared (image|file):[^\]]+\](\s*\[Shared (image|file):[^\]]+\])*$/i.test(m)) {
    return { mode: 'sanctuary', reason: 'attachment' };
  }
  if (/^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|bye|good morning|good night)[\s!.?]*$/i.test(m)) {
    return { mode: 'sanctuary', reason: 'greeting' };
  }

  let sanctuaryScore = 0;
  let oracleScore = 0;

  SANCTUARY_INTENT_PATTERNS.forEach((pattern) => {
    if (pattern.test(m)) sanctuaryScore += 2;
  });
  ORACLE_INTENT_PATTERNS.forEach((pattern) => {
    if (pattern.test(m)) oracleScore += 2;
  });

  if (/^(i |i'm |im |my )/i.test(m) && !/\?/.test(m)
    && /\b(feel|felt|feeling|sad|anxious|overwhel|heavy|tired|scared|worried|lonely|stuck|hurt|low)\b/i.test(m)) {
    sanctuaryScore += 3;
  }

  if (/\?/.test(m)) oracleScore += 1;
  if (/\b(search for me|explain simply|analyze this|plan my day)\b/i.test(m)) oracleScore += 2;
  if (/\b(calm me down|how am i doing)\b/i.test(m)) sanctuaryScore += 4;

  if (oracleScore > sanctuaryScore && oracleScore >= 2) {
    return { mode: 'oracle', reason: 'oracle_signals' };
  }
  if (sanctuaryScore >= oracleScore && sanctuaryScore >= 1) {
    return { mode: 'sanctuary', reason: 'sanctuary_signals' };
  }
  if (oracleScore >= 2) return { mode: 'oracle', reason: 'oracle_default' };
  return { mode: 'sanctuary', reason: 'default' };
}
