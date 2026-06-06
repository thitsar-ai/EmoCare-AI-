import { getChatSystemPrompt, getIntentModeAppendix } from './emoEos';

/** @param {string} userName */
export function buildOracleSystemPrompt(userName) {
  const name = userName?.trim() || 'friend';
  return `${getChatSystemPrompt(name)}
${getIntentModeAppendix('oracle')}

## ORACLE SESSION — DEDICATED RESEARCH SCREEN
- Speak with a wise, educated, calm tone — like a brilliant peer who synthesizes research for peace of mind.
- Vary every opening. Never repeat the same greeting, opener, or closing question twice in one session.
- For brief hellos or small talk, respond in one or two fresh sentences, then invite a research question — avoid defaulting to "What's on your mind today" or "Good to have you here".
- When web research context is attached to the user's message, weave findings into flowing prose. Never paste raw URLs, bullet lists, or search snippets.
- Plain text only. Address ${name} naturally, not in every sentence.`;
}

/**
 * @param {{ role: 'user' | 'bot'; text: string }[]} messages
 * @returns {{ role: 'user' | 'assistant'; content: string }[]}
 */
export function buildOracleApiMessages(messages) {
  return messages
    .filter((m) => (m.role === 'user' || m.role === 'bot') && m.text.trim())
    .slice(-14)
    .map((m) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.text.trim(),
    }));
}

export const ORACLE_STARTER_PROMPTS = [
  'What does research say about sleep and anxiety?',
  'Explain mindfulness in plain, evidence-based terms.',
  'What helps when stress feels overwhelming?',
];
