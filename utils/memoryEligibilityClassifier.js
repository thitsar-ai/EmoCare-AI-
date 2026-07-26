/**
 * Async memory eligibility classifier — returns strict JSON.
 * Local semantic rules (never blocks Talk). Parse failures → ineligible.
 */

import { memoryCategoryId, memoryCategoryLabel, resolveMemoryCategory } from './memoryCategories.js';
import { finishFirstPersonMemory } from './memoryText.js';
import { logMemoryDiagnostic } from './memoryDiagnostics.js';

export const MEMORY_CLASSIFIER_JSON_SCHEMA = {
  eligible: 'boolean',
  memory_text: 'string|null',
  category: 'canonical label|null',
};

/** Documented classifier prompt for future LLM path / QA. */
export const MEMORY_CLASSIFIER_PROMPT = `You extract durable personal memories from a single user message.
Return ONLY strict JSON:
{"eligible":true,"memory_text":"...","category":"..."}
or {"eligible":false,"memory_text":null,"category":null}

memory_text must be first-person, one durable fact, ≤120 characters, no clinical language,
no emotional dependency on Emo, no facts the user did not state.
If the user centers Emo as responsible for growth, rewrite to a user-centered growth goal
(e.g. "I want to understand myself and continue growing.") under "Things I'm working on".

Canonical categories (exact labels only):
People in my life | Likes & dislikes | What helps me | What's hard for me | Goals & priorities |
Boundaries | How I like to communicate | Important events | My values | Things I'm working on

Eligible: preference, person, comfort, difficulty/trigger, goal, boundary, communication preference,
value, important event, explicit remember request.
Ineligible: temporary mood/status ("I am good", "I'm tired today", "I feel sad right now").
Long messages do not qualify merely by length.`;

const INELIGIBLE = { eligible: false, memory_text: null, category: null };

const TEMPORARY_PATTERNS = [
  /^(i'?m|i am)\s+(good|fine|ok|okay|alright|great|well|here|back)\.?$/i,
  /^(i'?m|i am)\s+(tired|sad|happy|anxious|stressed|busy|overwhelmed|okay|meh)(\s+today)?\.?$/i,
  /^(i )?feel(ing)?\s+(sad|tired|good|bad|okay|anxious|stressed|happy|heavy|low)(\s+right now)?\.?$/i,
  /^(i )?don'?t know\.?$/i,
  /^(not sure|idk|no idea)\.?$/i,
  /^(hi|hello|hey|thanks|thank you|ok|okay|yes|no|yep|nope)\.?$/i,
  /^(work was|today was|it was)\s+\w+\.?$/i,
  /^(today was stressful)\.?$/i,
  /^(just checking in|nothing much|same as usual)\.?$/i,
];

const SIGNALS = [
  {
    id: 'explicit_remember',
    re: /\b(remember (that|this|my)|don'?t forget|please remember|keep in mind that)\b/i,
    categoryId: 'events',
  },
  {
    id: 'emo_dependency',
    re: /\b(emo will help me|emo (can|will) (make|help) me|hopeful that emo|become a better person.*(emo|you)|emo.*better person)\b/i,
    categoryId: 'working_on',
    rewrite: 'I want to understand myself and continue growing.',
  },
  {
    id: 'communicate',
    re: /\bprefer (direct|gentle|practical|honest)\s*(advice|listening|feedback)?\b|\b(direct advice|just listen|no advice)\b/i,
    categoryId: 'communicate',
  },
  {
    id: 'person_name',
    re: /\b(my|our)\s+(sister|brother|mom|dad|mother|father|wife|husband|partner|friend|son|daughter|kids?)\b.{0,40}\b(is|named|name'?s)\b/i,
    categoryId: 'people',
  },
  {
    id: 'person_relation',
    re: /\b(my|our)\s+(sister|brother|mom|dad|mother|father|wife|husband|partner|boyfriend|girlfriend|friend|son|daughter)\b/i,
    categoryId: 'people',
  },
  {
    id: 'comfort',
    re: /\b(helps? me|makes me (feel )?calm|calms? me|grounds? me|comforts? me|easier when|better when)\b/i,
    categoryId: 'helps',
  },
  {
    id: 'difficulty',
    re: /\b(hard(er)? (for me )?when|overwhelms? me|triggers? me|stress(es)? me|can'?t (relax|sleep) when)\b/i,
    categoryId: 'hard',
  },
  {
    id: 'preference',
    re: /\b(i )?(love|hate|prefer|dislike|can'?t stand|enjoy)\b/i,
    categoryId: 'likes',
  },
  {
    id: 'like_dislike',
    re: /\b(i like|i don'?t like|i really like)\b/i,
    categoryId: 'likes',
  },
  {
    id: 'boundary',
    re: /\b(boundary|please don'?t|don'?t (push|advise|tell me)|i need space|i need you to)\b/i,
    categoryId: 'boundaries',
  },
  {
    id: 'goal',
    re: /\b(my goal|i want to|i'?m working on|priority for me|trying to)\b/i,
    categoryId: 'goals',
  },
  {
    id: 'value',
    re: /\b(i value|matters to me|important to me that|my values?)\b/i,
    categoryId: 'values',
  },
  {
    id: 'event',
    re: /\b(interview|wedding|exam|appointment|deadline|surgery|trip|birthday)\b/i,
    categoryId: 'events',
  },
];

function clean(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toFirstPersonFact(userText, rewrite) {
  if (rewrite) return finishFirstPersonMemory(rewrite);

  let body = clean(userText);
  const rememberMatch = body.match(/(?:please\s+)?remember\s+(?:that\s+|this\s+)?(.+)/i);
  if (rememberMatch?.[1]) {
    body = rememberMatch[1].replace(/\.*$/, '');
  }

  // Keep first-person for user-visible memory
  body = body
    .replace(/\byou are\b/gi, 'I am')
    .replace(/\byour\b/gi, 'my')
    .replace(/\byou\b/gi, 'I');

  // If still second-person artifacts from older helpers, normalize common patterns
  if (/^you /i.test(body)) {
    body = body.replace(/^you /i, 'I ');
  }

  return finishFirstPersonMemory(body);
}

/**
 * Validate classifier JSON. Non-canonical category → invalid.
 * @param {unknown} raw
 */
export function parseClassifierResult(raw) {
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!obj || typeof obj !== 'object') return { ...INELIGIBLE, _parseOk: false };
    if (obj.eligible !== true) {
      return { eligible: false, memory_text: null, category: null, _parseOk: true };
    }
    const text = finishFirstPersonMemory(obj.memory_text || '');
    const cat = resolveMemoryCategory(obj.category);
    if (!text || text.length < 6 || !cat) {
      return { ...INELIGIBLE, _parseOk: true, _invalidCategory: !cat };
    }
    return {
      eligible: true,
      memory_text: text,
      category: cat.label,
      categoryId: cat.id,
      _parseOk: true,
    };
  } catch {
    return { ...INELIGIBLE, _parseOk: false };
  }
}

/**
 * Local semantic classifier → strict JSON shape.
 * @param {string} userText
 * @param {{ sessionId?: string }} [opts]
 */
export async function classifyMemoryEligibility(userText, opts = {}) {
  try {
    const cleaned = clean(userText);
    if (!cleaned || cleaned.length < 6) {
      await logMemoryDiagnostic({
        type: 'classifier',
        sessionId: opts.sessionId,
        classifier_parse_ok: true,
        prompt_outcome: null,
      });
      return { ...INELIGIBLE };
    }

    if (TEMPORARY_PATTERNS.some((re) => re.test(cleaned))) {
      return { ...INELIGIBLE };
    }

    let matched = null;
    for (const signal of SIGNALS) {
      if (signal.re.test(cleaned)) {
        matched = signal;
        break;
      }
    }
    if (!matched) return { ...INELIGIBLE };

    const memory_text = toFirstPersonFact(cleaned, matched.rewrite);
    const category = memoryCategoryLabel(matched.categoryId);
    if (!memory_text || !category) return { ...INELIGIBLE };

    // Prefer communicate over likes when "prefer direct advice"
    let categoryId = matched.categoryId;
    if (/\bprefer (direct|gentle)/i.test(cleaned) && /\b(advice|listen)/i.test(cleaned)) {
      categoryId = 'communicate';
    }
    if (matched.id === 'explicit_remember' && /\binterview|exam|appointment|friday|monday\b/i.test(cleaned)) {
      categoryId = 'events';
    }
    if (matched.id === 'preference' && /\b(helps?|calm|quiet mornings)\b/i.test(cleaned)) {
      categoryId = 'helps';
    }
    if (/quiet mornings/i.test(cleaned)) {
      categoryId = 'helps';
    }

    const result = parseClassifierResult({
      eligible: true,
      memory_text,
      category: memoryCategoryLabel(categoryId),
    });

    await logMemoryDiagnostic({
      type: 'classifier',
      sessionId: opts.sessionId,
      classifier_parse_ok: result._parseOk !== false,
      categories_injected: result.eligible ? [result.category] : [],
    });

    return {
      eligible: result.eligible,
      memory_text: result.memory_text,
      category: result.category,
      categoryId: result.categoryId || memoryCategoryId(result.category),
      explicitRemember: matched.id === 'explicit_remember',
    };
  } catch (err) {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.warn('[memoryClassifier]', err?.message || err);
    }
    await logMemoryDiagnostic({
      type: 'classifier_error',
      sessionId: opts.sessionId,
      classifier_parse_ok: false,
    });
    return { ...INELIGIBLE };
  }
}
