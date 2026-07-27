/**
 * Curated Burmese terminology for EmoCare — version-controlled, native-reviewed preferred.
 * Prefer these over literal English mood keys in Burmese UI and prompts.
 */

/** @type {Record<string, string>} */
export const EMO_BURMESE_TERMS = {
  Emo: 'အီမို',
  Mira: 'Mira',
  EmoCare: 'EmoCare',
  'check-in': 'နေ့စဉ်ခံစားချက် မှတ်တမ်း',
  CheckIn: 'Check-In',
  memory: 'အမှတ်တရ',
  memories: 'အမှတ်တရများ',
  Remembers: 'မှတ်မိထားသည်',
  light: 'စိတ်ပေါ့ပါးနေသည်',
  peaceful: 'စိတ်အေးချမ်းနေသည်',
  calm: 'စိတ်အေးနေသည်',
  heavy: 'စိတ်လေးလံနေသည်',
  anxious: 'စိုးရိမ်ပူပန်နေသည်',
  overwhelmed: 'စိတ်ဖိစီးလွန်းနေသည်',
  grateful: 'ကျေးဇူးတင်စိတ် ဖြစ်နေသည်',
  joyful: 'ပျော်ရွှင်နေသည်',
  happy: 'ပျော်ရွှင်နေသည်',
  sad: 'စိတ်မကောင်းဖြစ်နေသည်',
  tired: 'ပင်ပန်းနေသည်',
  hopeful: 'မျှော်လင့်ချက်ရှိနေသည်',
  present: 'လက်ရှိအချိန်မှာ ရှိနေသည်',
  'private and secure': 'လုံခြုံပြီး ကိုယ်ရေးကိုယ်တာ အဖြစ် ထိန်းသိမ်းထားသည်',
};

/**
 * @param {string} [moodKey]
 */
export function burmeseMoodTerm(moodKey) {
  const key = String(moodKey || '')
    .trim()
    .toLowerCase();
  return EMO_BURMESE_TERMS[key] || null;
}

/**
 * Compact chip body (prefix "မှတ်မိထားသည်" is rendered separately by EmoMemoryChip).
 * Example body: စိတ်ပေါ့ပါးနေသည် • အမှတ်တရ ၂ ခု
 * @param {string} [moodLabel]
 * @param {number} [memoryCount]
 */
export function formatBurmeseMemoryPill(moodLabel, memoryCount = 0) {
  const parts = [];
  const mood = burmeseMoodTerm(moodLabel);
  if (mood) {
    parts.push(mood);
  } else if (moodLabel) {
    const key = String(moodLabel).trim();
    if (!/^[A-Za-z][A-Za-z\s-]*$/.test(key)) parts.push(`ခံစားချက် ${key}`);
  }
  const n = Number(memoryCount) || 0;
  const myanmarDigits = String(n).replace(/\d/g, (d) => '၀၁၂၃၄၅၆၇၈၉'[Number(d)]);
  if (n === 1) parts.push('အမှတ်တရ ၁ ခု');
  else if (n > 1) parts.push(`အမှတ်တရ ${myanmarDigits} ခု`);
  if (!parts.length) return null;
  return parts.join(' • ');
}
