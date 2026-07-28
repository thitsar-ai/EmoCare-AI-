#!/usr/bin/env node
/**
 * Final Burmese onboarding / nav / mood verification (master copy).
 * Run: node scripts/verify-burmese-onboarding-qa.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { t } from '../utils/uiCopy/index.js';
import { CHAT_LANGUAGE_OPTIONS, getChatLanguageOptionsForUi } from '../utils/chatLanguage.js';
import { MIRA_LANGUAGE_OPTIONS } from '../utils/miraLanguage.js';
import { getMainMenuLabel, getAskMiraMenuCopy, getTalkToEmoMenuCopy } from '../utils/appMenuCopy.js';
import { applyMyanmarUiStyle } from '../utils/localeText.js';
import { OB_CONTENT_SLIDES } from '../utils/onboardingFlowOrder.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function assertNoLatinPhrase(key, forbidden) {
  const v = t('my', key);
  for (const f of forbidden) {
    assert.ok(!v.includes(f), `${key} still contains "${f}": ${v}`);
  }
}

// —— Flow order ——
assert.deepEqual(OB_CONTENT_SLIDES, [2, 4, 5, 6, 7]);

// —— 1 Welcome ——
assert.equal(t('my', 'onboarding.slideWelcome'), 'ကြိုဆိုပါတယ်');
assert.equal(t('my', 'onboarding.welcomeEyebrow'), 'EMOCARE');
assert.equal(t('my', 'onboarding.welcomeTitle'), 'Emo နဲ့ Mira ကို သိကျွမ်းလိုက်ပါ။');
assert.ok(t('my', 'onboarding.welcomeBody').includes('EmoCare'));
assert.equal(t('my', 'onboarding.companionsTitle'), 'သင့်အဖော်နှစ်ယောက်');
assert.ok(t('my', 'onboarding.emoCompanion').startsWith('Emo —'));
assert.ok(t('my', 'onboarding.miraCompanion').startsWith('Mira —'));
assert.ok(t('my', 'onboarding.welcomeSafety').includes('AI'));
assert.equal(t('my', 'common.continue'), 'ဆက်လက်မည်');

// —— 2 Privacy ——
assert.equal(t('my', 'onboarding.slidePrivacy'), 'ကိုယ်ရေးလုံခြုံမှု');
assert.equal(t('my', 'onboarding.privacyTitle'), 'သင့်အတွေးတွေက သင်နဲ့ပဲ ရှိနေမှာပါ။');
const privacyTitles = [
  'onboarding.encryptedDevice',
  'onboarding.neverSold',
  'onboarding.memoryLedgerControl',
  'onboarding.fullTransparency',
  'onboarding.aiMayProcess',
];
const privacyBodies = [
  'onboarding.privacyCardBody1',
  'onboarding.privacyCardBody2',
  'onboarding.memoryLedgerControlBody',
  'onboarding.fullTransparencyBody',
  'onboarding.privacyCardBody3',
];
for (const k of [...privacyTitles, ...privacyBodies]) {
  assert.ok(t('my', k).length > 4, k);
}
assert.equal(
  t('my', 'onboarding.privacyAck'),
  'ကျွန်ုပ်၏ အချက်အလက်များကို မည်သို့အသုံးပြုသည်ကို ဖတ်ရှုနားလည်ပါသည်။',
);
assert.equal(t('my', 'onboarding.privacyUnderstand'), 'နားလည်ပါပြီ — ဆက်လက်မည်');
assert.ok(/ကုဒ်|စက်/.test(t('my', 'onboarding.privacyCardBody1')));
assert.ok(/မရောင်း/.test(t('my', 'onboarding.privacyCardBody2')));
assert.ok(/Anthropic|AI/.test(t('my', 'onboarding.privacyCardBody3')));

// —— 3 About You ——
assert.equal(t('my', 'onboarding.slideAboutYou'), 'သင့်အကြောင်း');
assert.equal(t('my', 'onboarding.aboutYouTitle'), 'သင့်အကြောင်း နည်းနည်းပြောပြပါ။');
assert.equal(t('my', 'onboarding.preferredName'), 'ခေါ်စေချင်သော အမည်');
assert.equal(t('my', 'onboarding.preferredNamePlaceholder'), 'မဖြည့်လည်းရပါတယ်');
assert.equal(t('my', 'onboarding.pronounsSelect'), 'ရွေးချယ်ပါ');
assert.equal(t('my', 'onboarding.pronounUseName'), 'ကျွန်ုပ်၏အမည်ကို သုံးပါ');
assert.equal(t('my', 'onboarding.pronounCustom'), 'အခြား…');
assert.equal(t('my', 'onboarding.pronounPreferNot'), 'မဖော်ပြလိုပါ');
assert.equal(t('my', 'onboarding.emoLanguage'), 'Emo ပြန်ဖြေမည့် ဘာသာစကား');
assert.equal(t('my', 'onboarding.miraLanguage'), 'Mira ပြန်ဖြေမည့် ဘာသာစကား');
const idOpt = CHAT_LANGUAGE_OPTIONS.find((o) => o.id === 'id');
assert.equal(idOpt.shortLabel, 'Bahasa Indonesia');
assert.equal(MIRA_LANGUAGE_OPTIONS.find((o) => o.id === 'id').shortLabel, 'Bahasa Indonesia');
assert.ok(getChatLanguageOptionsForUi('my').some((o) => o.shortLabel === 'အလိုအလျောက်'));

const onboardingSrc = readFileSync(join(root, 'components/onboarding/OnboardingFlow.tsx'), 'utf8');
assert.ok(onboardingSrc.includes('case 6:'), 'Feeling screen wired');
assert.ok(onboardingSrc.includes('case 7:'), 'Ready screen wired');
assert.ok(onboardingSrc.includes('OB_FEELING_SLIDE'), 'feeling slide constant');
assert.ok(onboardingSrc.includes('OB_READY_SLIDE'), 'ready slide constant');
assert.ok(onboardingSrc.includes('pronounCustomMode'), 'custom pronoun mode wired');
const aboutYouBlock = onboardingSrc.match(/case 5:[\s\S]*?(?=case 6:)/)?.[0] || '';
const feelingBlock = onboardingSrc.match(/case 6:[\s\S]*?(?=case 7:)/)?.[0] || '';
assert.ok(!aboutYouBlock.includes('MoodPicker'), 'mood not on About You');
assert.ok(feelingBlock.includes('MoodPicker'), 'mood on Feeling screen');

// —— 4 Feeling ——
assert.equal(t('my', 'onboarding.slideFeeling'), 'ဒီနေ့ရဲ့ ခံစားချက်');
assert.equal(t('my', 'onboarding.feelingTitle'), 'အခု ဘယ်လိုခံစားနေရပါသလဲ။');
assert.equal(t('my', 'onboarding.feelingOptional'), 'မရွေးလည်းရပါတယ်');
assert.equal(t('my', 'onboarding.skipForNow'), 'ယခုကျော်မည်');
const moods = {
  heavy: 'စိတ်လေးလံ',
  overwhelmed: 'မနိုင်မနင်း',
  neutral: 'သာမန်',
  hopeful: 'မျှော်လင့်ချက်ရှိ',
  light: 'ပေါ့ပါး',
  peaceful: 'အေးချမ်း',
  grateful: 'ကျေးဇူးတင်မိ',
  joyful: 'ရွှင်လန်း',
};
for (const [id, title] of Object.entries(moods)) {
  assert.equal(t('my', `mood.${id}`), title);
  assert.ok(t('my', `mood.desc.${id}`).length > 6, `desc ${id}`);
}
const acks = {
  Heavy: 'ဒီလိုခံစားရတဲ့နေ့တွေ ရှိတတ်တာ သဘာဝပါ',
  Overwhelmed: 'အရာအားလုံး များလွန်းနေသလို',
  Neutral: 'ဒီနေ့ကို သာမန်အတိုင်း',
  Hopeful: 'မျှော်လင့်ချက်လေးကို တန်ဖိုးထား',
  Light: 'စိတ်ပေါ့ပါးလာတာ ဝမ်းသာပါတယ်',
  Peaceful: 'အေးချမ်းနေတဲ့ ဒီအခိုက်အတန့်',
  Grateful: 'ကျေးဇူးတင်စရာတစ်ခုကို သတိထားမိ',
  Joyful: 'ရွှင်လန်းနေတာ ဝမ်းသာပါတယ်',
};
for (const [label, snippet] of Object.entries(acks)) {
  assert.ok(t('my', `onboarding.moodAck${label}`).includes(snippet), label);
}
assert.equal(t('my', 'onboarding.emoLabel'), 'Emo');

// —— 5 Ready ——
assert.equal(t('my', 'onboarding.slideReady'), 'အဆင်သင့်ပါပြီ');
assert.equal(t('my', 'onboarding.readyTitle'), 'Emo နဲ့ Mira တို့ သင့်ဘေးမှာ အတူရှိနေပါပြီ။');
assert.equal(t('my', 'onboarding.start'), 'စတင်မယ်');

// —— 6 Menu / tabs ——
assert.equal(getMainMenuLabel('my', 'home'), 'စိတ်နားခိုရာ');
assert.equal(getMainMenuLabel('my', 'checkin'), 'ခံစားချက် မှတ်မယ်');
assert.equal(getMainMenuLabel('my', 'journal'), 'ရင်ဖွင့်မှတ်တမ်း');
assert.equal(getMainMenuLabel('my', 'insights'), 'ထိုးထွင်းသိမြင်မှုများ');
assert.equal(getMainMenuLabel('my', 'today'), 'ယနေ့အတွက်');
assert.equal(getMainMenuLabel('my', 'memoryledger'), 'မှတ်သားထားမှုများ');
assert.equal(getMainMenuLabel('my', 'settings'), 'ဆက်တင်များ');
assert.equal(getMainMenuLabel('my', 'profile'), 'အမည်နှင့် ပရိုဖိုင်');
assert.equal(getMainMenuLabel('my', 'aboutyou'), 'သင့်အကြောင်း');
assert.equal(getAskMiraMenuCopy('my').title, 'အတွင်းစိတ် လမ်းညွှန်မှု');
assert.equal(getTalkToEmoMenuCopy('my').title, 'Emo နဲ့ စကားပြောမယ်');
assert.equal(t('my', 'nav.tab.home'), 'ပင်မ');
assert.equal(t('my', 'nav.tab.checkin'), 'ခံစားချက်');
assert.equal(t('my', 'nav.tab.today'), 'ယနေ့');
assert.equal(t('my', 'nav.tab.talk'), 'Emo');
assert.equal(t('my', 'nav.tab.journal'), 'ဂျာနယ်');
assert.equal(t('my', 'home.sanctuary'), 'စိတ်နားခိုရာ');
assert.equal(t('my', 'journal.title'), 'ရင်ဖွင့်မှတ်တမ်း');
assert.equal(t('my', 'memory.title'), 'မှတ်သားထားမှုများ');
assert.ok(t('my', 'nav.checkin').length > t('my', 'nav.tab.checkin').length);
assert.ok(!t('my', 'nav.tab.talk').includes('စကားပြော'));
assert.ok(t('my', 'msg.copy').includes('ကူးယူ'));
assert.ok(t('my', 'talk.starter1').length > 4);

assert.equal(t('my', 'settings.emoLanguage'), 'Emo ပြန်ဖြေမည့် ဘာသာစကား');
assert.equal(t('my', 'settings.miraLanguage'), 'Mira ပြန်ဖြေမည့် ဘာသာစကား');
assert.equal(t('my', 'settings.profile'), 'အမည်နှင့် ပရိုဖိုင်');
assert.equal(t('my', 'settings.privacy'), 'ကိုယ်ရေးလုံခြုံမှု');
assert.equal(t('my', 'settings.helpSupport'), 'အကူအညီနှင့် ပံ့ပိုးမှု');
assert.equal(t('my', 'common.terms'), 'အသုံးပြုမှု စည်းကမ်းချက်များ');
assert.equal(t('my', 'settings.deleteAccount'), 'အကောင့်ဖျက်ရန်');
assert.equal(t('my', 'profile.title'), 'အမည်နှင့် ပရိုဖိုင်');

const appSrc = readFileSync(join(root, 'App.tsx'), 'utf8');
assert.ok(appSrc.includes("ui('nav.tab.home')"), 'tab bar uses short keys');

const moodPickerSrc = readFileSync(join(root, 'components/shared/MoodPicker.tsx'), 'utf8');
assert.ok(
  moodPickerSrc.includes("showSelectionGlow = variant === 'checkin'"),
  'onboarding mood has no glow double-outline',
);

// —— 7 Typography ——
const patched = applyMyanmarUiStyle({ fontSize: 14, letterSpacing: 1.5, fontFamily: 'Georgia' });
assert.equal(patched.letterSpacing, 0);
assert.ok(!patched.fontFamily);
assert.ok(patched.lineHeight >= Math.ceil(14 * 1.78));

console.log('OK — Burmese master copy verification (Welcome → Ready / Menu / Tabs)');
