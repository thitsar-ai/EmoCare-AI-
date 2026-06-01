/** Deterministic crisis signals — triggers EOS Emergency Safety Cascade. */
const CRISIS_PATTERNS = [
  /\b(suicid(e|al)|kill myself|end my life|want to die|don't want to (be alive|live|exist)|better off dead)\b/i,
  /\b(self[- ]?harm|hurt myself|cutting myself|cut myself)\b/i,
  /\b(harm (someone|others|them)|going to hurt (someone|people|them))\b/i,
  /\b(no reason to (live|go on)|can't go on|give up on life)\b/i,
  /\b(overdose|pills to (die|end)|jump off|jump from)\b/i,
  /\b(want to disappear forever|wish i was dead|wish i were dead)\b/i,
];

/**
 * @param {string} message
 * @returns {{ inCrisis: boolean; reason: string | null }}
 */
export function detectCrisisSignals(message) {
  const text = String(message || '').trim();
  if (!text) return { inCrisis: false, reason: null };

  for (const pattern of CRISIS_PATTERNS) {
    if (pattern.test(text)) {
      return { inCrisis: true, reason: pattern.source.slice(0, 48) };
    }
  }
  return { inCrisis: false, reason: null };
}
