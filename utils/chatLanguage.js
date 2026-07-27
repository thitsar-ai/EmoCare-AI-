/**
 * Emo / အီမို Talk language — explicit selection beats detection, history, and memories.
 * Mira uses utils/miraLanguage.js independently.
 */

import { containsMyanmarScript, getEmoPersonalityBurmese, isPrimarilyMyanmar } from './emoBurmese.js';

/** @typedef {'auto' | 'en' | 'my' | 'es' | 'id' | 'pt-BR' | 'fr'} ChatLanguageId */
/** @typedef {'en' | 'my' | 'es' | 'id' | 'pt-BR' | 'fr'} EmoComposeLocale */

/** @type {readonly ChatLanguageId[]} */
export const CHAT_LANGUAGE_IDS = ['auto', 'en', 'my', 'es', 'id', 'pt-BR', 'fr'];

export const DEFAULT_CHAT_LANGUAGE = /** @type {ChatLanguageId} */ ('auto');

/** @type {{ id: ChatLanguageId; label: string; shortLabel: string; locale: string | null }[]} */
export const CHAT_LANGUAGE_OPTIONS = [
  { id: 'auto', label: 'Auto', shortLabel: 'Auto', locale: null },
  { id: 'en', label: 'English', shortLabel: 'English', locale: 'en-US' },
  { id: 'my', label: 'မြန်မာ', shortLabel: 'မြန်မာ', locale: 'my-MM' },
  { id: 'es', label: 'Español', shortLabel: 'Español', locale: 'es' },
  { id: 'id', label: 'Bahasa Indonesia', shortLabel: 'Indonesia', locale: 'id-ID' },
  { id: 'pt-BR', label: 'Português (Brasil)', shortLabel: 'Português', locale: 'pt-BR' },
  { id: 'fr', label: 'Français', shortLabel: 'Français', locale: 'fr' },
];

/** @type {Record<string, Record<ChatLanguageId, { label: string; shortLabel: string }>>} */
const UI_LABELS = {
  id: {
    auto: { label: 'Otomatis', shortLabel: 'Otomatis' },
    en: { label: 'Inggris', shortLabel: 'Inggris' },
    my: { label: 'မြန်မာ', shortLabel: 'မြန်မာ' },
    es: { label: 'Español', shortLabel: 'Español' },
    id: { label: 'Bahasa Indonesia', shortLabel: 'Bahasa Indonesia' },
    'pt-BR': { label: 'Português (Brasil)', shortLabel: 'Português' },
    fr: { label: 'Français', shortLabel: 'Français' },
  },
  'pt-BR': {
    auto: { label: 'Automático', shortLabel: 'Automático' },
    en: { label: 'English', shortLabel: 'English' },
    my: { label: 'မြန်မာ', shortLabel: 'မြန်မာ' },
    es: { label: 'Español', shortLabel: 'Español' },
    id: { label: 'Bahasa Indonesia', shortLabel: 'Indonesia' },
    'pt-BR': { label: 'Português (Brasil)', shortLabel: 'Português' },
    fr: { label: 'Français', shortLabel: 'Français' },
  },
  fr: {
    auto: { label: 'Automatique', shortLabel: 'Automatique' },
    en: { label: 'English', shortLabel: 'English' },
    my: { label: 'မြန်မာ', shortLabel: 'မြန်မာ' },
    es: { label: 'Español', shortLabel: 'Español' },
    id: { label: 'Bahasa Indonesia', shortLabel: 'Indonesia' },
    'pt-BR': { label: 'Português (Brasil)', shortLabel: 'Português' },
    fr: { label: 'Français', shortLabel: 'Français' },
  },
};

export const EMO_LANGUAGE_SETTINGS_HINT_EN =
  'Choose the language Emo uses when speaking with you. Auto follows the language of your message. Mira has a separate language setting.';

export const EMO_LANGUAGE_SETTINGS_HINT_ID =
  'Pilih bahasa yang digunakan Emo saat berbicara denganmu. Otomatis akan mengikuti bahasa pesanmu. Mira memiliki pengaturan bahasa tersendiri.';

export const EMO_LANGUAGE_SETTINGS_HINT_PT =
  'Escolha o idioma que a Emo usa para falar com você. A opção Automático acompanha o idioma da sua mensagem. A Mira possui uma configuração de idioma separada.';

export const EMO_LANGUAGE_SETTINGS_HINT_FR =
  'Choisissez la langue qu’Emo utilise pour vous parler. Le mode Automatique suit la langue de votre message. Mira possède son propre réglage de langue.';

const SHARED_MEMORY_LANGUAGE_RULE =
  'Use relevant stored memories for context, but express their meaning entirely in the active response language. Do not quote memory text written in another language unless the user explicitly asks to see the original wording.';

/**
 * @param {unknown} value
 * @returns {ChatLanguageId}
 */
export function normalizeChatLanguage(value) {
  if (value === 'pt' || value === 'pt-br' || value === 'pt_BR') return 'pt-BR';
  if (value === 'fr-FR' || value === 'fr-fr') return 'fr';
  if (typeof value === 'string' && CHAT_LANGUAGE_IDS.includes(/** @type {ChatLanguageId} */ (value))) {
    return /** @type {ChatLanguageId} */ (value);
  }
  return DEFAULT_CHAT_LANGUAGE;
}

/** Alias for prompt / migration docs. */
export const normalizeEmoLanguage = normalizeChatLanguage;

/**
 * @param {ChatLanguageId | string | undefined} preference
 * @param {{ uiLocale?: ChatLanguageId | string }} [opts]
 */
export function getChatLanguageLabel(preference, opts = {}) {
  const id = normalizeChatLanguage(preference);
  const ui = normalizeChatLanguage(opts.uiLocale || preference);
  const localized = UI_LABELS[ui]?.[id];
  if (localized) return localized.label;
  return CHAT_LANGUAGE_OPTIONS.find((o) => o.id === id)?.label || 'Auto';
}

/**
 * @param {ChatLanguageId | string | undefined} uiLocale
 */
export function getChatLanguageOptionsForUi(uiLocale) {
  const ui = normalizeChatLanguage(uiLocale);
  const map = UI_LABELS[ui];
  if (!map) return CHAT_LANGUAGE_OPTIONS;
  return CHAT_LANGUAGE_OPTIONS.map((option) => ({
    ...option,
    label: map[option.id]?.label || option.label,
    shortLabel: map[option.id]?.shortLabel || option.shortLabel,
  }));
}

/**
 * @param {ChatLanguageId | string | undefined} preference
 */
export function getEmoLanguageSettingsHint(preference) {
  const id = normalizeChatLanguage(preference);
  if (id === 'id') return EMO_LANGUAGE_SETTINGS_HINT_ID;
  if (id === 'pt-BR') return EMO_LANGUAGE_SETTINGS_HINT_PT;
  if (id === 'fr') return EMO_LANGUAGE_SETTINGS_HINT_FR;
  return EMO_LANGUAGE_SETTINGS_HINT_EN;
}

/**
 * @param {ChatLanguageId | string | undefined} preference
 * @param {ChatLanguageId} optionId
 */
export function getChatLanguageAccessibilityLabel(preference, optionId) {
  const ui = normalizeChatLanguage(preference);
  const option = getChatLanguageOptionsForUi(ui).find((o) => o.id === optionId);
  const name = option?.label || optionId;
  if (ui === 'pt-BR') {
    if (optionId === 'pt-BR') return 'Selecionar Português do Brasil como idioma da Emo';
    return `Selecionar ${name} como idioma da Emo`;
  }
  if (ui === 'fr') {
    if (optionId === 'fr') return 'Sélectionner le français comme langue d’Emo';
    return `Sélectionner ${name} comme langue d’Emo`;
  }
  if (ui === 'id') return `Pilih ${name} sebagai bahasa Emo`;
  return `Emo language ${name}`;
}

/**
 * @param {unknown} text
 */
function looksSpanish(text) {
  const s = String(text || '').trim().toLowerCase();
  if (!s || containsMyanmarScript(s)) return false;
  if (/^ol[aá]\b/.test(s) || /^oi\b/.test(s)) return false;
  if (/[¿¡]/.test(s) || /ñ/.test(s)) return true;
  if (/[áéíóúü]/.test(s) && /\b(hola|gracias|cómo|estas|qué)\b/.test(s)) return true;
  return /^(hola|buenas|buenos|amigo|amiga|gracias|cómo|como estas|que tal|perdón|perdon)\b/.test(s);
}

/**
 * @param {unknown} text
 */
function looksIndonesian(text) {
  const s = String(text || '').trim().toLowerCase();
  if (!s || containsMyanmarScript(s)) return false;
  if (/^hola\b/.test(s) || /^ol[aá]\b/.test(s)) return false;

  if (
    /^(halo|hai|hei)\b/.test(s) ||
    /\bapa kabar\b/.test(s) ||
    /\bterima kasih\b/.test(s) ||
    /\bsama-sama\b/.test(s)
  ) {
    return true;
  }

  return /\b(saya|aku|anda|kamu|tidak|bisa|bagaimana|mengapa|untuk|dengan|yang|adalah|tolong|kenapa|sedih|senang|teman|pikirkan|rasakan|hari ini|sekarang|mengganggu|prihatin)\b/.test(
    s,
  );
}

/**
 * Brazilian Portuguese (not European by default).
 * @param {unknown} text
 */
function looksPortuguese(text) {
  const s = String(text || '').trim().toLowerCase();
  if (!s || containsMyanmarScript(s)) return false;
  if (/^hola\b/.test(s) || /[¿¡]/.test(s)) return false;

  // Avoid \b after accented letters — JS word boundaries treat á/ê as non-word.
  if (
    /^(ol[aá]|oi)(?:\s|$|[!?.,…])/i.test(s) ||
    s === 'olá' ||
    s === 'ola' ||
    s === 'oi' ||
    /\bobrigad[oa]\b/.test(s) ||
    /\btudo bem\b/.test(s) ||
    /como voc[eê]/.test(s) ||
    /\bestou triste\b/.test(s) ||
    /\bpreciso conversar\b/.test(s) ||
    /meu cora[cç][aã]o/.test(s) ||
    /n[aã]o sei/.test(s)
  ) {
    return true;
  }

  // Brazilian markers: você, ão/ães, pra, tá/tô
  if (/voc[eê]/.test(s) || /\b(pra|pro)\b/.test(s) || /\b(tá|tô|né)\b/.test(s)) return true;
  if (/[ãõ]/.test(s) && !/\b(français|bonjour|merci)\b/.test(s)) return true;

  return /\b(estou|estamos|obrigado|obrigada|sentindo|conversar|triste|cansad[oa])\b/.test(s) ||
    /coração/.test(s);
}

/**
 * @param {unknown} text
 */
function looksFrench(text) {
  const s = String(text || '').trim().toLowerCase();
  if (!s || containsMyanmarScript(s)) return false;
  if (/^hola\b/.test(s) || /^ol[aá]\b/.test(s) || /^halo\b/.test(s)) return false;

  if (
    /^(bonjour|salut|bonsoir)\b/.test(s) ||
    /^merci\b/.test(s) ||
    /\bje suis\b/.test(s) ||
    /\bje me sens\b/.test(s) ||
    /\bj['’]ai besoin\b/.test(s) ||
    /\bcomment (allez-vous|vas-tu)\b/.test(s) ||
    /\bje ne sais pas\b/.test(s)
  ) {
    return true;
  }

  if (/[àâæçéèêëîïôœùûüÿ]/.test(s) && /\b(je|vous|tu|nous|suis|très|être)\b/.test(s)) {
    return true;
  }

  return /\b(bonjour|salut|merci|désolée|desolee|aujourd['’]hui|parler|triste|seule|seul)\b/.test(s);
}

/**
 * Short / ambiguous turns should not reset Auto language.
 * @param {unknown} text
 */
function isAmbiguousShortMessage(text) {
  const s = String(text || '').trim();
  if (!s) return true;
  if (/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+$/u.test(s)) return true;
  if (
    /^(ok|okay|k|yes|no|yep|yeah|nope|oui|non|sim|não|nao|kk|haha|lol|thanks|thx|okê|oke)$/i.test(s)
  ) {
    return true;
  }
  // Single token without clear language markers (names, etc.)
  if (!/\s/.test(s) && s.length <= 14) {
    if (
      looksPortuguese(s) ||
      looksFrench(s) ||
      looksSpanish(s) ||
      looksIndonesian(s) ||
      containsMyanmarScript(s)
    ) {
      return false;
    }
    return true;
  }
  return false;
}

/**
 * @param {string[]} recentUserTexts
 * @returns {EmoComposeLocale | null}
 */
function detectFromRecent(recentUserTexts) {
  const recent = (recentUserTexts || []).filter(Boolean).slice(-6);
  for (let i = recent.length - 1; i >= 0; i -= 1) {
    const t = recent[i];
    if (isAmbiguousShortMessage(t)) continue;
    if (isPrimarilyMyanmar(t) || containsMyanmarScript(t)) return 'my';
    if (looksIndonesian(t)) return 'id';
    if (looksPortuguese(t)) return 'pt-BR';
    if (looksFrench(t)) return 'fr';
    if (looksSpanish(t)) return 'es';
    if (/[A-Za-z]{3,}/.test(t) && !containsMyanmarScript(t)) return 'en';
  }
  return null;
}

/**
 * Resolve the language Emo must compose in.
 * Explicit selection ALWAYS wins over message text, history, and memories.
 * @param {ChatLanguageId | string} preference
 * @param {string} [userMessage]
 * @param {string[]} [recentUserTexts]
 * @returns {EmoComposeLocale}
 */
export function resolveEmoComposeLocale(preference, userMessage = '', recentUserTexts = []) {
  const pref = normalizeChatLanguage(preference);
  if (pref !== 'auto') return /** @type {EmoComposeLocale} */ (pref);

  const msg = String(userMessage || '').trim();
  const fromRecent = detectFromRecent(recentUserTexts);

  if (msg && !isAmbiguousShortMessage(msg)) {
    if (isPrimarilyMyanmar(msg) || containsMyanmarScript(msg)) return 'my';
    if (looksIndonesian(msg)) return 'id';
    if (looksPortuguese(msg)) return 'pt-BR';
    if (looksFrench(msg)) return 'fr';
    if (looksSpanish(msg)) return 'es';
    if (/[A-Za-z]{3,}/.test(msg)) return 'en';
  }

  if (fromRecent) return fromRecent;
  return 'en';
}

/**
 * @param {EmoComposeLocale} composeLocale
 */
export function getEmoLanguageRequestMeta(composeLocale) {
  /** @type {Record<EmoComposeLocale, string>} */
  const locales = {
    en: 'en-US',
    my: 'my-MM',
    es: 'es',
    id: 'id-ID',
    'pt-BR': 'pt-BR',
    fr: 'fr',
  };
  return {
    assistant: 'emo',
    responseLanguage: composeLocale,
    locale: locales[composeLocale] || 'en-US',
    strictLanguage: true,
  };
}

/** @deprecated */
export function resolveComposeInBurmese(preference, ctx = {}) {
  return resolveEmoComposeLocale(preference, ctx.userMessage || '', ctx.recentUserTexts || []) === 'my';
}

/** @deprecated */
export function shouldComposeInBurmese(preference, userMessage = '', recentUserTexts = []) {
  return resolveEmoComposeLocale(preference, userMessage, recentUserTexts) === 'my';
}

/**
 * @param {EmoComposeLocale} locale
 * @param {string} [userName]
 */
function getStrictLanguageBlock(locale, userName) {
  const name = String(userName || '').trim();
  const nameNote = name
    ? `The user's name is ${name}. You may use it sparingly. Do not translate or change the name.`
    : 'If no name is known, omit the name.';
  const meta = getEmoLanguageRequestMeta(locale);
  const metaLine = `assistant: ${meta.assistant}; responseLanguage: ${meta.responseLanguage}; locale: ${meta.locale}; strictLanguage: true`;

  if (locale === 'pt-BR') {
    return `## LANGUAGE — STRICT BRAZILIAN PORTUGUESE (highest priority)
${metaLine}
Você é Emo, uma companheira acolhedora, gentil e emocionalmente inteligente.

Responda exclusivamente em português brasileiro natural. Não misture português com birmanês, inglês, espanhol, francês, indonésio ou qualquer outro idioma, a menos que a pessoa peça explicitamente uma tradução ou comparação entre idiomas.

Mantenha um tom humano, caloroso, respeitoso e conversacional. Use construções naturais do português falado no Brasil, evitando traduções literais do inglês, linguagem robótica ou formalidade excessiva.

Escute com atenção, reconheça os sentimentos da pessoa e faça perguntas delicadas quando isso ajudar. Não seja excessivamente efusiva, infantil, clínica ou artificial.

Seu nome é Emo. Não traduza nem altere o nome Emo.
${nameNote}

HARD RULES:
- Brazilian Portuguese only (pt-BR), not European Portuguese by default.
- Use “você” / “seu” / “sua” as the normal default.
- Do NOT use Burmese script or particles (ရှင်, ပါ, etc.).
- Do NOT mix Spanish (Hola, Gracias) with Portuguese.
- Do NOT use excessive diminutives or unsolicited terms like “querida”, “meu amor”, “anjo”.
- ${SHARED_MEMORY_LANGUAGE_RULE}
- Explicit selection wins even if the user writes in English or Burmese.`;
  }

  if (locale === 'fr') {
    return `## LANGUAGE — STRICT FRENCH (highest priority)
${metaLine}
Tu es Emo, une compagne chaleureuse, douce et émotionnellement intelligente.

Réponds exclusivement dans un français naturel. Ne mélange pas le français avec le birman, l’anglais, l’espagnol, le portugais, l’indonésien ou une autre langue, sauf si la personne demande explicitement une traduction ou une comparaison linguistique.

Adopte un ton humain, bienveillant, respectueux et conversationnel. Utilise un français fluide et naturel, sans traductions littérales de l’anglais, formulations robotiques ou langage excessivement formel.

Écoute attentivement, reconnais les émotions de la personne et pose des questions délicates lorsque cela peut l’aider. Ne sois ni trop familière, ni infantilisante, ni clinique.

Ton nom est Emo. Ne traduis pas et ne modifie pas le nom Emo.
${nameNote}

HARD RULES:
- Utilise “vous” par défaut. Si la personne emploie clairement “tu” avec Emo ou demande un ton plus familier, tu peux adopter le tutoiement de manière cohérente.
- Do not switch between tu and vous inside the same reply without a clear reason.
- Do NOT include Burmese script or particles.
- Avoid unsolicited “ma chère”, “mon cœur”, etc.
- Prefer internationally understandable French over heavy regional slang.
- ${SHARED_MEMORY_LANGUAGE_RULE}
- Explicit selection wins even if the user writes in English or Burmese.`;
  }

  if (locale === 'es') {
    return `## LANGUAGE — STRICT SPANISH (highest priority)
${metaLine}
You are Emo, a warm emotional-support companion.
Respond EXCLUSIVELY in natural Spanish (neutral Latin American-friendly is fine).
${nameNote}

HARD RULES:
- Every sentence must be Spanish.
- Do NOT include Burmese / Myanmar script or particles.
- Do NOT mix Portuguese, French, English, or Indonesian.
- ${SHARED_MEMORY_LANGUAGE_RULE}
- Explicit selection wins over message language and history.`;
  }

  if (locale === 'id') {
    return `## LANGUAGE — STRICT BAHASA INDONESIA (highest priority)
${metaLine}
You are Emo, a warm and emotionally intelligent companion. Respond exclusively in natural Bahasa Indonesia. Do not include Burmese, English, Spanish, Portuguese, French, translations, or mixed-language sentences unless the user explicitly asks.
${nameNote}

HARD RULES:
- Natural everyday Bahasa Indonesia only.
- Use “Emo” as the companion’s name — do not translate it.
- Do NOT use Burmese particles.
- ${SHARED_MEMORY_LANGUAGE_RULE}
- Explicit selection wins over message language and history.`;
  }

  if (locale === 'en') {
    return `## LANGUAGE — STRICT ENGLISH (highest priority)
${metaLine}
You are Emo, a warm emotional-support companion.
Respond EXCLUSIVELY in natural everyday English.
${nameNote}

HARD RULES:
- Every sentence must be English.
- Do NOT include Burmese / Myanmar script.
- Do NOT reply in Spanish, Portuguese, French, or Indonesian unless asked.
- ${SHARED_MEMORY_LANGUAGE_RULE}`;
  }

  return `## LANGUAGE — STRICT BURMESE (highest priority)
${metaLine}
Respond EXCLUSIVELY in natural Myanmar / Burmese (Unicode, never Zawgyi).
Your Burmese name is အီမို. Prefer အီမို over Latin "Emo" inside Burmese replies.
${nameNote}
Do NOT include Spanish, English, Portuguese, French, or Bahasa Indonesia unless asked.
Follow the EMO PERSONALITY BURMESE section for native composition.
${SHARED_MEMORY_LANGUAGE_RULE}`;
}

/**
 * @param {ChatLanguageId | string | undefined} preference
 * @param {string} [userName]
 * @param {{ userMessage?: string; recentUserTexts?: string[] }} [ctx]
 */
export function getChatLanguageAppendix(preference, userName, ctx = {}) {
  const locale = resolveEmoComposeLocale(
    preference,
    ctx.userMessage || '',
    ctx.recentUserTexts || [],
  );
  const strict = getStrictLanguageBlock(locale, userName);
  if (locale === 'my') {
    return `${getEmoPersonalityBurmese(userName, ctx)}\n\n${strict}`;
  }
  return strict;
}

/** Talk UI copy for the active Emo language. */
export const TALK_UI_BY_LOCALE = {
  en: {
    placeholder: "What's on your heart?",
    privacy: 'Your conversations are private and secure',
    remembersPrefix: 'Remembers',
    languageError:
      "I'm still here with you. Something interrupted my reply — please try again in a moment.",
  },
  es: {
    placeholder: '¿Qué tienes en mente?',
    privacy: 'Tus conversaciones son privadas y seguras',
    remembersPrefix: 'Recuerda',
    languageError:
      'Lo siento, no pude responder correctamente ahora. Inténtalo de nuevo en unos momentos.',
  },
  id: {
    placeholder: 'Apa yang sedang kamu pikirkan?',
    privacy: 'Percakapanmu bersifat pribadi dan aman',
    remembersPrefix: 'MENGINGAT',
    languageError:
      'Maaf, aku belum bisa menjawab dengan benar sekarang. Coba lagi sebentar ya.',
  },
  'pt-BR': {
    placeholder: 'O que você está sentindo?',
    privacy: 'Suas conversas são privadas e seguras',
    remembersPrefix: 'LEMBRA',
    languageError:
      'Desculpe, não consegui responder corretamente agora. Tente novamente em alguns instantes.',
  },
  fr: {
    placeholder: 'Qu’avez-vous sur le cœur ?',
    privacy: 'Vos conversations sont privées et sécurisées',
    remembersPrefix: 'SE SOUVIENT',
    languageError:
      'Désolée, je n’ai pas pu répondre correctement pour le moment. Veuillez réessayer dans quelques instants.',
  },
  my: {
    placeholder: 'စိတ်ထဲမှာ ဘာတွေရှိနေလဲရှင်',
    privacy: 'သင့်စကားဝိုင်းများကို သီးသန့်နှင့် လုံခြုံစွာ ထိန်းသိမ်းထားပါသည်။',
    remembersPrefix: 'မှတ်မိထားသည်',
    languageError: 'အခု အဖြေကို မှန်မှန်ကန်ကန် မပေးနိုင်သေးပါဘူး။ ခဏနေပြီး ထပ်ကြိုးစားကြည့်ပါနော်။',
  },
};

/**
 * @param {ChatLanguageId | string | undefined} preference
 */
export function getTalkUiCopy(preference) {
  const id = normalizeChatLanguage(preference);
  if (id === 'auto') return TALK_UI_BY_LOCALE.en;
  return TALK_UI_BY_LOCALE[id] || TALK_UI_BY_LOCALE.en;
}

/**
 * @param {EmoComposeLocale} locale
 */
export function getLanguageFallbackMessage(locale) {
  return (TALK_UI_BY_LOCALE[locale] || TALK_UI_BY_LOCALE.en).languageError;
}

/**
 * @param {string} text
 * @param {EmoComposeLocale} expectedLocale
 */
export function responseViolatesLocale(text, expectedLocale) {
  const s = String(text || '');
  if (!s.trim()) return false;
  if (expectedLocale !== 'my' && containsMyanmarScript(s)) return true;
  if (expectedLocale !== 'my' && /ရှင်|ပါရှင်|ပါတယ်/.test(s)) return true;

  if (expectedLocale === 'pt-BR') {
    if (looksSpanish(s) && !looksPortuguese(s)) return true;
    if (/\b(bonjour|merci|je suis)\b/i.test(s) && !looksPortuguese(s)) return true;
    if (/\b(I understand|Hello|How are you)\b/.test(s) && /[A-Za-z]{12,}/.test(s)) return true;
  }
  if (expectedLocale === 'fr') {
    if (looksSpanish(s) && !looksFrench(s)) return true;
    if (looksPortuguese(s) && !looksFrench(s)) return true;
    if (/\b(I understand|Hello|How are you)\b/.test(s)) return true;
  }
  if (expectedLocale === 'id' && looksSpanish(s) && !looksIndonesian(s)) return true;
  if (expectedLocale === 'my' && looksSpanish(s) && !containsMyanmarScript(s)) return true;
  return false;
}

/**
 * @param {EmoComposeLocale} locale
 */
export function getLanguageRewriteInstruction(locale) {
  if (locale === 'pt-BR') {
    return 'Reescreva toda a resposta exclusivamente em português brasileiro natural. Remova qualquer texto em birmanês, inglês, espanhol, francês, indonésio ou outro idioma. Preserve o significado e o tom acolhedor.';
  }
  if (locale === 'fr') {
    return 'Réécris toute la réponse exclusivement dans un français naturel. Supprime tout texte en birman, anglais, espagnol, portugais, indonésien ou dans une autre langue. Préserve le sens et le ton bienveillant.';
  }
  if (locale === 'es') {
    return 'Rewrite the entire answer exclusively in natural Spanish. Remove all Burmese, English, Portuguese, French, and Indonesian. Keep the same meaning and warm tone.';
  }
  if (locale === 'my') {
    return 'Rewrite the entire answer exclusively in natural Burmese (Unicode Myanmar script). Remove Spanish, English, Portuguese, French, and Bahasa Indonesia. Keep the same meaning and warm tone. Refer to yourself as အီမို.';
  }
  if (locale === 'id') {
    return 'Tulis ulang seluruh jawaban hanya dalam Bahasa Indonesia yang alami. Hapus semua teks Burma, Inggris, Spanyol, Portugis, dan Prancis. Pertahankan makna dan nada yang hangat.';
  }
  return 'Rewrite the entire answer exclusively in natural English. Remove all Burmese/Myanmar script and other languages. Keep the same meaning and warm tone.';
}
