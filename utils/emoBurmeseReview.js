/**
 * Burmese quality review pass — fluency/coherence, not mere Myanmar Unicode presence.
 * Pipeline: Generate → native-editor review → rewrite if needed → display.
 */

import { ANTHROPIC_MODEL, callAnthropicMessages } from './anthropic.js';
import { normalizeBurmeseText, countBurmeseHonorificDensity } from './emoBurmeseNormalize.js';
import { containsMyanmarScript } from './emoBurmese.js';
import { getEmoIdentityBlock } from './emoIdentity.js';

/** Strongest conversational model available for Burmese (do not downgrade). */
export const ANTHROPIC_MODEL_BURMESE = ANTHROPIC_MODEL;

const SCORE_MIN = 4;

/**
 * @param {unknown} raw
 */
function parseReviewJson(raw) {
  const text = String(raw || '').trim();
  const fenced = text.match(/\{[\s\S]*\}/);
  if (!fenced) return null;
  try {
    return JSON.parse(fenced[0]);
  } catch {
    return null;
  }
}

/**
 * Fast local gates before spending a review call.
 * @param {string} response
 * @param {string} [userMessage]
 */
export function burmeseLocalQualityFlags(response, userMessage = '') {
  const issues = [];
  const s = String(response || '');
  if (!containsMyanmarScript(s)) issues.push('missing_myanmar_script');
  if (countBurmeseHonorificDensity(s) > 0.9 && s.length > 80) {
    issues.push('excessive_honorifics');
  }
  if (/သစ္စာ/.test(s) && !String(userMessage || '').includes('သစ္စာ')) {
    // May still be wrong if user isn't named that — flag soft for reviewer
    issues.push('possible_wrong_name_သစ္စာ');
  }
  // Stacked သင်/သင့် often signals translated, impersonal Burmese
  const thinCount = (s.match(/သင်|သင့်/g) || []).length;
  if (thinCount >= 3) {
    issues.push('excessive_သင်_pronoun');
  }
  if (/ကလေးဘဝ|ကျောင်းတက်|မိဘ|မွေးဖွား/.test(s) && /အီမို|ကျွန်မ/.test(s)) {
    issues.push('possible_invented_human_biography');
  }
  return issues;
}

/**
 * @param {{
 *   userMessage: string;
 *   draftResponse: string;
 *   userName?: string;
 *   intent?: string;
 * }} opts
 */
export async function reviewBurmeseResponse(opts) {
  const draft = normalizeBurmeseText(opts.draftResponse);
  const localIssues = burmeseLocalQualityFlags(draft, opts.userMessage);

  const system = `You are a native Myanmar Burmese editor reviewing အီမို (EmoCare companion) replies.
${getEmoIdentityBlock('my')}

Evaluate the draft Burmese reply. Return ONLY valid JSON:
{
  "pass": boolean,
  "fluencyScore": 1-5,
  "coherenceScore": 1-5,
  "spellingScore": 1-5,
  "personaScore": 1-5,
  "issues": string[],
  "revisedResponse": string|null
}

Rules:
- pass=true only if all scores >= ${SCORE_MIN} and meaning answers the user.
- If pass=false, revisedResponse must be a complete corrected Burmese answer.
- Fix spelling, unnatural translation, unclear meaning, particle spam, repetition, invented biography.
- Preserve warm tone. Keep name as given (never invent သစ္စာ).
- If userName is provided, prefer that name once near the start instead of stacking သင်/သင့်. Then omit the subject naturally.
- Prefer concise 2–6 sentences unless the user asked for a story.
- Unicode Myanmar only. No Zawgyi. No English unless a product term.`;

  const userPayload = JSON.stringify({
    intent: opts.intent || 'unknown',
    userName: opts.userName || null,
    namePersonalizationRule: opts.userName
      ? `Use "${opts.userName}" naturally once near the start instead of သင်/သင့်; do not repeat the name every sentence.`
      : 'No name available — prefer subject omission over repeated သင်/သင့်.',
    userMessage: String(opts.userMessage || '').slice(0, 800),
    draftResponse: draft.slice(0, 2500),
    localFlags: localIssues,
  });

  const result = await callAnthropicMessages({
    system,
    maxTokens: 900,
    model: ANTHROPIC_MODEL_BURMESE,
    route: 'talk',
    languageMeta: {
      assistant: 'emo',
      responseLanguage: 'my',
      locale: 'my-MM',
      strictLanguage: true,
      stage: 'burmese_review',
    },
    messages: [{ role: 'user', content: userPayload }],
  });

  if (!result.ok) {
    return {
      pass: localIssues.length === 0,
      fluencyScore: localIssues.length ? 3 : 4,
      coherenceScore: localIssues.length ? 3 : 4,
      spellingScore: 4,
      personaScore: 4,
      issues: [...localIssues, 'review_call_failed'],
      revisedResponse: null,
      model: ANTHROPIC_MODEL_BURMESE,
      rewriteOccurred: false,
    };
  }

  const text =
    result.data?.content?.find((b) => b.type === 'text')?.text?.trim() ?? '';
  const parsed = parseReviewJson(text);
  if (!parsed || typeof parsed !== 'object') {
    return {
      pass: localIssues.length === 0,
      fluencyScore: 3,
      coherenceScore: 3,
      spellingScore: 3,
      personaScore: 3,
      issues: [...localIssues, 'review_parse_failed'],
      revisedResponse: null,
      model: ANTHROPIC_MODEL_BURMESE,
      rewriteOccurred: false,
    };
  }

  const fluencyScore = Number(parsed.fluencyScore) || 0;
  const coherenceScore = Number(parsed.coherenceScore) || 0;
  const spellingScore = Number(parsed.spellingScore) || 0;
  const personaScore = Number(parsed.personaScore) || 0;
  const scoresOk =
    fluencyScore >= SCORE_MIN &&
    coherenceScore >= SCORE_MIN &&
    spellingScore >= SCORE_MIN &&
    personaScore >= SCORE_MIN;
  const pass = Boolean(parsed.pass) && scoresOk;
  let revised = parsed.revisedResponse ? normalizeBurmeseText(parsed.revisedResponse) : null;
  if (!pass && !revised) {
    revised = null;
  }

  return {
    pass,
    fluencyScore,
    coherenceScore,
    spellingScore,
    personaScore,
    issues: Array.isArray(parsed.issues) ? parsed.issues : localIssues,
    revisedResponse: revised,
    model: ANTHROPIC_MODEL_BURMESE,
    rewriteOccurred: Boolean(revised && !pass),
  };
}

/**
 * Ensure a displayable Burmese reply after at most one review rewrite.
 * @param {{
 *   userMessage: string;
 *   draftResponse: string;
 *   userName?: string;
 *   intent?: string;
 * }} opts
 */
export async function ensureQualityBurmeseReply(opts) {
  const draft = normalizeBurmeseText(opts.draftResponse);
  const review = await reviewBurmeseResponse({ ...opts, draftResponse: draft });

  if (review.pass) {
    return {
      text: draft,
      review,
      displayedAfterRewrite: false,
    };
  }

  if (review.revisedResponse && containsMyanmarScript(review.revisedResponse)) {
    // Second evaluation — soft: accept rewrite if local flags clear
    const secondFlags = burmeseLocalQualityFlags(review.revisedResponse, opts.userMessage);
    if (secondFlags.length === 0 || secondFlags.every((f) => f.startsWith('possible_'))) {
      return {
        text: review.revisedResponse,
        review: { ...review, pass: true, rewriteOccurred: true },
        displayedAfterRewrite: true,
      };
    }
  }

  // Last-resort rewrite instruction (one more generation)
  const rewrite = await callAnthropicMessages({
    system: `သင်သည် အီမို ဖြစ်သည်။ မြန်မာဘာသာဖြင့်သာ သဘာဝကျကျ ပြင်ဆင်ရေးသားပါ။ JSON မလို။
${getEmoIdentityBlock('my')}
ပြင်ရမည့်အချက်များ: ${(review.issues || []).join(', ') || 'သဘာဝမကျ / အဓိပ္ပာယ်မရှင်း'}`,
    maxTokens: 700,
    model: ANTHROPIC_MODEL_BURMESE,
    route: 'talk',
    languageMeta: {
      assistant: 'emo',
      responseLanguage: 'my',
      locale: 'my-MM',
      strictLanguage: true,
      stage: 'burmese_rewrite',
    },
    messages: [
      {
        role: 'user',
        content: `အသုံးပြုသူ: ${String(opts.userMessage || '').slice(0, 600)}\n\nမူကြမ်း:\n${draft.slice(0, 2000)}\n\nအထက်ပါ မူကြမ်းကို သဘာဝကျပြီး အဓိပ္ပာယ်ပြည့်ဝသော မြန်မာစာဖြင့်သာ ပြန်ရေးပါ။`,
      },
    ],
  });

  const rewritten =
    rewrite.ok
      ? normalizeBurmeseText(
          rewrite.data?.content?.find((b) => b.type === 'text')?.text?.trim() ?? '',
        )
      : '';

  if (rewritten && containsMyanmarScript(rewritten)) {
    return {
      text: rewritten,
      review: { ...review, rewriteOccurred: true, revisedResponse: rewritten },
      displayedAfterRewrite: true,
    };
  }

  return {
    text:
      'အခု အဖြေကို မှန်မှန်ကန်ကန် မပေးနိုင်သေးပါဘူး။ ခဏနေပြီး ထပ်ကြိုးစားကြည့်ပါနော်။',
    review: { ...review, rewriteOccurred: true, issues: [...(review.issues || []), 'fallback'] },
    displayedAfterRewrite: true,
  };
}

/**
 * Dev-safe language quality log (no message content).
 * @param {object} info
 */
export function logBurmeseQualityDev(info) {
  if (!__DEV__) return;
  console.log('[Emo Burmese Quality]', {
    model: info.model || ANTHROPIC_MODEL_BURMESE,
    language: 'my',
    intent: info.intent,
    responseLength: info.responseLength,
    rewriteOccurred: Boolean(info.rewriteOccurred),
    fluencyScore: info.fluencyScore,
    coherenceScore: info.coherenceScore,
    spellingScore: info.spellingScore,
    personaScore: info.personaScore,
    pass: info.pass,
  });
}
