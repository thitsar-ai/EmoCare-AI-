#!/usr/bin/env node
/**
 * Burmese mood titles + Emo supportive responses (Feeling screen — master copy).
 * Run: node scripts/test-burmese-mood-ack.mjs
 */
import assert from 'node:assert/strict';
import { t } from '../utils/uiCopy/index.js';

const titles = {
  heavy: 'စိတ်လေးလံ',
  overwhelmed: 'မနိုင်မနင်း',
  neutral: 'သာမန်',
  hopeful: 'မျှော်လင့်ချက်ရှိ',
  light: 'ပေါ့ပါး',
  peaceful: 'အေးချမ်း',
  grateful: 'ကျေးဇူးတင်မိ',
  joyful: 'ရွှင်လန်း',
};

const acks = {
  Heavy:
    'ဒီလိုခံစားရတဲ့နေ့တွေ ရှိတတ်တာ သဘာဝပါ။ အခုအချိန်မှာ ကိုယ့်ကိုယ်ကို နည်းနည်းသက်သာအောင် ဂရုစိုက်ပေးရင် ကောင်းပါတယ်။',
  Overwhelmed:
    'အရာအားလုံး များလွန်းနေသလို ခံစားရရင် တစ်ခုပြီးတစ်ခု ဖြည်းဖြည်းစီ ကြည့်ရအောင်။ အားလုံးကို တစ်ပြိုင်နက် ဖြေရှင်းဖို့ မလိုပါဘူး။',
  Neutral:
    'ဒီနေ့ကို သာမန်အတိုင်း ဖြတ်သန်းနေရတာလည်း လုံလောက်ပါတယ်။ ကိုယ့်အရှိန်နဲ့ အေးအေးဆေးဆေး သွားလို့ရပါတယ်။',
  Hopeful:
    'အဲဒီ မျှော်လင့်ချက်လေးကို တန်ဖိုးထားလိုက်ပါ။ ရှေ့ဆက်ဖို့ အလင်းရောင်လေးတစ်စင်း ဖြစ်လာနိုင်ပါတယ်။',
  Light:
    'စိတ်ပေါ့ပါးလာတာ ဝမ်းသာပါတယ်။ ဒီပေါ့ပါးမှုလေးကို ခဏနားပြီး အေးအေးဆေးဆေး ခံစားလိုက်ပါ။',
  Peaceful:
    'အေးချမ်းနေတဲ့ ဒီအခိုက်အတန့်လေးကို သေချာခံစားထားလိုက်ပါ။ ဒီငြိမ်သက်မှုလေးက သင့်ကို အားဖြည့်ပေးနိုင်ပါတယ်။',
  Grateful:
    'ကျေးဇူးတင်စရာတစ်ခုကို သတိထားမိတာ အရမ်းလှပါတယ်။ ဒီခံစားချက်လေးက စိတ်ကို ပိုနူးညံ့စေတတ်ပါတယ်။',
  Joyful:
    'ရွှင်လန်းနေတာ ဝမ်းသာပါတယ်။ ဒီအခိုက်အတန့်လေးကို အပြည့်အဝ ခံစားထားလိုက်ပါ။',
};

for (const [id, want] of Object.entries(titles)) {
  assert.equal(t('my', `mood.${id}`), want, `title ${id}`);
  assert.notEqual(t('my', `mood.desc.${id}`), t('en', `mood.desc.${id}`), `desc translated ${id}`);
}

for (const [label, want] of Object.entries(acks)) {
  assert.equal(t('my', `onboarding.moodAck${label}`), want, `ack ${label}`);
}

assert.equal(t('my', 'onboarding.emoLabel'), 'Emo');
assert.equal(t('my', 'onboarding.skipForNow'), 'ယခုကျော်မည်');
assert.equal(t('en', 'mood.heavy'), 'Heavy');

console.log('OK — Burmese mood titles, descriptions, and Emo supportive responses (master)');
