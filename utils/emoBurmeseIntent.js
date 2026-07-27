/**
 * Lightweight Burmese conversation intents for example selection & length hints.
 */

/** @typedef {'greeting'|'emotional_disclosure'|'casual'|'identity'|'story'|'factual'|'advice'|'reflection'|'correction'|'translation'|'just_listen'|'gratitude'|'good_night'|'celebration'|'safety'|'unknown'} BurmeseTalkIntent */

/**
 * @param {string} [userMessage]
 * @returns {BurmeseTalkIntent}
 */
export function classifyBurmeseTalkIntent(userMessage) {
  const m = String(userMessage || '').trim();
  if (!m) return 'unknown';

  if (/သတ်|ကိုယ့်ကိုယ်ကို|အဆုံးစီရင်|မနေချင်|သေချင်/.test(m)) return 'safety';

  if (
    /အီမို.?ရဲ့.?အကြောင်း|မင်း.?ဇာတ်လမ်း|နင်.?ဇာတ်လမ်း|သင့်.?ဇာတ်လမ်း|tell me your story|your story|who are you|မင်းဘယ်သူ|နင်ဘယ်သူ/i.test(
      m,
    )
  ) {
    return 'story';
  }
  if (/အီမို.?ဘယ်သူ|သင်ဘယ်သူ|မင်းက ဘာလဲ|identity/i.test(m)) return 'identity';

  if (/မှား|မမှန်|စာလုံးပေါင်း|ပြင်ပေး|wrong spelling|incorrect|မမှန်ဘူး/.test(m)) return 'correction';

  if (/ဘာမှ.?မဖြေရှင်း|စကားပဲ|နားထောင်|just listen|don't solve|မဖြေရှင်းချင်/i.test(m)) {
    return 'just_listen';
  }

  if (/မင်္ဂလာ|hello|hi\b|ကောင်း.?နေ|မင်္ဂလာပါ/i.test(m) && m.length < 40) return 'greeting';
  if (/ကောင်း.?ည|အိပ်|good night|ည.?ကောင်း/i.test(m)) return 'good_night';
  if (/ကျေးဇူးတင်ပါတယ်|thank you|thanks/i.test(m) && m.length < 60) return 'gratitude';
  if (/ပျော်|ဝမ်းသာ|ဂုဏ်ယူ|celebration|congrats/i.test(m) && m.length < 80) return 'celebration';

  if (
    /စိတ်မကောင်း|ဝမ်းနည်း|အထီးကျန်|တစ်ယောက်တည်း|စိုးရိမ်|ကြောက်|ဒေါသ|ပင်ပန်း|လေး|ဖိစီး|lonely|sad|anxious|angry|tired|overwhelmed/i.test(
      m,
    )
  ) {
    return 'emotional_disclosure';
  }

  if (/ဘာလုပ်ရမလဲ|အကြံ|ဘယ်လို.?လုပ်|advice|help me decide|လမ်းညွှန်/i.test(m)) return 'advice';
  if (/ဘာကြောင့်|ဘာလဲ|ဘယ်တော့|ဘယ်သူ|ဘာသာပြန်|translate|ဆိုလို/i.test(m) && /\?|လား|လဲ/.test(m)) {
    return 'factual';
  }
  if (/တွေး|ရောင်ပြန်|reflect|ခံစားချက်/i.test(m)) return 'reflection';
  if (/ဘာလုပ်နေ|စကားပြော|casual|how's it going/i.test(m)) return 'casual';

  return 'unknown';
}

/**
 * @param {BurmeseTalkIntent} intent
 */
export function burmeseIntentGuidance(intent) {
  switch (intent) {
    case 'story':
    case 'identity':
      return 'Intent: identity/story. Use the canonical အီမို biography only. Do not invent a human childhood. Answer clearly in 2–4 short paragraphs.';
    case 'just_listen':
      return 'Intent: just listen. Acknowledge briefly. Do not problem-solve. Invite them to speak. One short paragraph is enough.';
    case 'correction':
      return 'Intent: user correction. Thank them, accept the correction, ask which word if unclear. Do not be defensive.';
    case 'greeting':
      return 'Intent: greeting. Warm, brief. One gentle check-in question at most.';
    case 'emotional_disclosure':
      return 'Intent: emotional disclosure. Acknowledge feeling, stay concrete, one gentle question at most. Avoid filler.';
    case 'advice':
      return 'Intent: advice. Offer 1–2 practical, gentle options. Not clinical.';
    case 'factual':
      return 'Intent: factual/simple question. Answer directly. For deep research, you may gently mention Mira can help with deeper synthesis.';
    case 'safety':
      return 'Intent: safety concern. Follow crisis safety rules in calm Burmese.';
    default:
      return 'Intent: conversation. Answer the actual question. Prefer 2–6 meaningful sentences.';
  }
}
