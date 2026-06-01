import AsyncStorage from '@react-native-async-storage/async-storage';

export const MEMORY_LEDGER_KEY = 'emoMemoryLedger';

export const DEFAULT_MEMORY_ITEMS = [
  {
    id: 'name',
    label: 'Your name',
    summary: 'How Emo addresses you in conversation.',
    usage:
      'Emo uses your name to personalize greetings and replies. Keeping this helps conversations feel warm and direct — never performative.',
  },
  {
    id: 'checkin-mood',
    label: 'Latest check-in mood',
    summary: 'The feeling you most recently logged.',
    usage:
      'Emo gently factors your latest mood into tone and pacing — softer when you are heavy, brighter when you are light — without treating you like a diagnosis.',
  },
  {
    id: 'journal-themes',
    label: 'Journal themes',
    summary: 'Recurring topics from entries you choose to explore with Emo.',
    usage:
      'When you tap "Ask Emo about this" on a journal entry, Emo holds that context for the next Talk session so you do not have to repeat yourself.',
  },
  {
    id: 'conversation-context',
    label: 'Recent conversation context',
    summary: 'The current chat thread on this device.',
    usage:
      'Emo remembers what you have said in this session so replies stay coherent. Delete the conversation anytime from the Talk menu.',
  },
];

export async function loadMemoryLedger() {
  try {
    const raw = await AsyncStorage.getItem(MEMORY_LEDGER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return DEFAULT_MEMORY_ITEMS.map((item) => ({ ...item, enabled: true }));
}

export async function saveMemoryLedger(items) {
  try {
    await AsyncStorage.setItem(MEMORY_LEDGER_KEY, JSON.stringify(items));
  } catch {}
}
