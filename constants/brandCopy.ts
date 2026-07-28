/** User-facing product name — never "EmoCare AI" in UI. */
import { tokens } from '../theme/tokens';

export const BRAND_NAME = 'EmoCare';

export const BRAND_TAGLINE = 'Intelligence with Soul.';

/** Splash / launch footer — warm sanctuary welcome (Version 1 energy). */
export const BRAND_SPLASH_FOOTER = 'Your Emotional Sanctuary';

/** Talk screen header — editorial presence, not a messaging-app title bar. */
export const TALK_HEADER_TITLE = 'Emo';
export const TALK_HEADER_TAGLINE = 'Intelligence with Soul';

/** Talk empty-state hero — sanctuary welcome lines. */
export function buildTalkHeroLines(userName: string) {
  const name = userName.trim() || 'friend';
  return {
    greeting: `Hello, ${name} 💜`,
    welcomeBack: 'Welcome back.',
    presence: 'Emo is with you.',
    prompt: "What's on your heart today?",
  };
}

/** First message when starting a new Talk conversation. */
export function buildTalkWelcomeMessage(userName: string): string {
  const { greeting, welcomeBack, presence, prompt } = buildTalkHeroLines(userName);
  return `${greeting}\n${welcomeBack}\n${presence}\n${prompt}`;
}

export const TALK_CONVERSATION_STARTERS = [
  { icon: '💭', text: "Help me understand what I'm feeling" },
  { icon: '🌱', text: 'I need encouragement' },
  { icon: '🫶', text: 'I want to talk about my day' },
  { icon: '😌', text: 'Help me find calm' },
  { icon: '✨', text: 'Give me perspective' },
  { icon: '📝', text: 'Help me journal' },
] as const;

/** Talk screen surface colors — sanctuary gradient canvas + frosted cards. */
export const TALK_BG = tokens.bg.canvasTop;
export const TALK_CONVERSATION_SURFACE = tokens.bg.card;
export const TALK_INPUT_SURFACE = tokens.bg.card;
export const TALK_INPUT_PLACEHOLDER = "What's on your heart?";

/**
 * Mira — reflective guidance / research / wisdom companion.
 * Internal route/storage keys may still say "oracle" (legacy).
 */
export const ORACLE_HEADER_TITLE = 'Mira';
export const ORACLE_HEADER_TAGLINE = 'Research • Strategy • Wise Perspective';
export const ORACLE_INPUT_PLACEHOLDER = 'Ask Mira…';
export const ORACLE_STATUS_MESSAGE = 'Searching trusted sources and synthesizing…';
export const ORACLE_STATUS_SHORT = 'Researching…';
export const MIRA_EMPTY_ROLE =
  'When you need clarity, perspective, or deeper understanding.';
export const MIRA_EMPTY_PROMPT = 'Is there something I can help you understand today?';
export const MIRA_EMPTY_ROLE_MY =
  'ပိုမိုရှင်းလင်းစွာ နားလည်ဖို့၊ မတူညီတဲ့ အမြင်တစ်ခု ရဖို့၊ ဒါမှမဟုတ် နက်နက်ရှိုင်းရှိုင်း လေ့လာဖို့ လိုတဲ့အခါ Mira က ကူညီပေးနိုင်ပါတယ်ရှင်။';
export const MIRA_EMPTY_PROMPT_MY = 'ဒီနေ့ ဘာအကြောင်းကို နားလည်ချင်ပါသလဲရှင်။';
export const MIRA_INTRO =
  "Hi, I'm Mira. I'm here to help you reflect, understand patterns, and find clarity within yourself.";

export type OracleCategoryId =
  | 'knowledge'
  | 'learning'
  | 'business'
  | 'ideas'
  | 'world'
  | 'relationships'
  | 'history'
  | 'science';

export const ORACLE_CATEGORIES: {
  id: OracleCategoryId;
  icon: string;
  label: string;
  starter: string;
}[] = [
  { id: 'knowledge', icon: '🧠', label: 'Knowledge', starter: 'Explain ' },
  { id: 'learning', icon: '📚', label: 'Learning', starter: 'Help me learn about ' },
  { id: 'business', icon: '💼', label: 'Business', starter: 'Create a business strategy for ' },
  { id: 'ideas', icon: '💡', label: 'Ideas', starter: 'Give me creative ideas for ' },
  { id: 'world', icon: '🌍', label: 'World', starter: "What's happening with " },
  { id: 'relationships', icon: '❤️', label: 'Relationships', starter: 'Help me understand ' },
  { id: 'history', icon: '🏛', label: 'History', starter: 'Tell me about the history of ' },
  { id: 'science', icon: '🔬', label: 'Science', starter: 'Explain the science of ' },
];

export type OracleModeId = 'quick' | 'deep' | 'wise';

export const ORACLE_MODES: {
  id: OracleModeId;
  label: string;
  shortLabel: string;
  hint: string;
}[] = [
  {
    id: 'quick',
    label: 'Quick Insight',
    shortLabel: 'Insight',
    hint: 'Clear and concise guidance',
  },
  {
    id: 'deep',
    label: 'Deep Research',
    shortLabel: 'Research',
    hint: 'Thorough analysis using reliable published sources',
  },
  {
    id: 'wise',
    label: 'Wise Perspective',
    shortLabel: 'Perspective',
    hint: 'Balanced insight, context, strategy, and thoughtful guidance',
  },
];

export function oracleSourcesLabel(count: number): string {
  if (count <= 0) return '';
  if (count === 1) return 'Drawn from one published source';
  return `Drawn from ${count} published sources`;
}
