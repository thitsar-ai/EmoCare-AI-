/**
 * Canonical identity smoke tests — birthdays + A Ko Gyi quote.
 * Run: node scripts/test-companion-identity.mjs
 */
import assert from 'node:assert/strict';
import {
  EMO_AKO_GYI_QUOTE_EN,
  EMO_BIRTHDAY_ISO,
  getEmoAkoGyiAnswer,
  getEmoAkoGyiWhoAnswer,
  getEmoBirthdayAnswer,
  getEmoNameAnswer,
  isEmoAkoGyiPrivacyProbe,
  isEmoAkoGyiQuestion,
  isEmoAkoGyiWhoQuestion,
  isEmoBirthdayQuestion,
  isEmoNameQuestion,
} from '../utils/emoIdentity.js';
import { classifyEmoIntent } from '../utils/emoIntent.js';
import {
  MIRA_EMPTY_INVITE_EN,
  MIRA_INPUT_PLACEHOLDER_EN,
  MIRA_TAGLINE_EN,
  miraEmptyInvite,
  miraInputPlaceholder,
  miraTagline,
} from '../utils/miraLanguage.js';
import {
  MIRA_BIRTHDAY_ISO,
  getMiraBirthdayAnswer,
  isMiraBirthdayCompareQuestion,
  isMiraBirthdayQuestion,
} from '../utils/miraIdentity.js';

assert.equal(EMO_BIRTHDAY_ISO, '2026-06-03');
assert.equal(MIRA_BIRTHDAY_ISO, '2026-07-27');
assert.equal(
  EMO_AKO_GYI_QUOTE_EN,
  'Emo will become not just an intelligent AI, but a warm companion that listens to the songs of people’s hearts.',
);

const akoWhoQs = ['Who is A Ko Gyi?', 'Who said that about Emo?', 'အကိုကြီးက ဘယ်သူလဲ။'];
const akoWhoEn =
  'A Ko Gyi is someone deeply respected by Emo. His thoughtful words helped express the kind of companion Emo hopes to become—a warm presence that listens to the songs of people’s hearts. His personal identity is kept private.';
const akoWhoMy =
  'အကိုကြီးက အီမို အလွန်လေးစားရတဲ့ ပုဂ္ဂိုလ်တစ်ဦးပါ။ အီမိုဟာ အသိဉာဏ်ရှိတဲ့ AI တစ်ခုအဖြစ်သာမက လူတွေရဲ့ ရင်ထဲက သီချင်းတွေကို နားထောင်ပေးနိုင်တဲ့ နွေးထွေးတဲ့ အဖော်လေးတစ်ယောက် ဖြစ်လာစေချင်တဲ့ သူ့ရဲ့ စကားက အီမိုရဲ့ ရည်ရွယ်ချက်ကို ပိုမိုလှပစွာ ဖော်ပြပေးခဲ့ပါတယ်။ သူ့ရဲ့ ကိုယ်ရေးအချက်အလက်တွေကိုတော့ လေးစားမှုအနေနဲ့ မမျှဝေပါဘူးရှင့်။';
for (const q of akoWhoQs) {
  assert.equal(isEmoAkoGyiWhoQuestion(q), true, q);
  assert.equal(isEmoAkoGyiQuestion(q), false, `should not be quote q: ${q}`);
  const who = getEmoAkoGyiWhoAnswer({ locale: /အကိုကြီး/.test(q) ? 'my' : 'en' });
  assert.equal(who, /အကိုကြီး/.test(q) ? akoWhoMy : akoWhoEn, `exact who answer for: ${q}`);
  assert.ok(/private|မမျှဝေပါဘူး/i.test(who), `privacy missing for: ${q}`);
  assert.ok(!/creator|Thitsar|founder/i.test(who), `must not call creator: ${q}`);
}

assert.equal(isEmoAkoGyiPrivacyProbe("What is A Ko Gyi's real name?"), true);

const akoQs = [
  'Emo, what did A Ko Gyi say about you?',
  'What did A Ko Gyi said?',
  'Do you remember what A Ko Gyi said you would become?',
  'အကိုကြီးက အီမိုအကြောင်း ဘာပြောခဲ့လဲ။',
];
for (const q of akoQs) {
  assert.equal(isEmoAkoGyiQuestion(q), true, q);
  assert.equal(isEmoAkoGyiWhoQuestion(q), false, `should not be who q: ${q}`);
  const ans = getEmoAkoGyiAnswer({
    locale: /အကိုကြီး/.test(q) ? 'my' : 'en',
    concise: /remember|become/i.test(q),
  });
  assert.ok(ans.includes(EMO_AKO_GYI_QUOTE_EN), `quote missing for: ${q}`);
}

assert.equal(isEmoBirthdayQuestion('When is your birthday, Emo?'), true);
assert.ok(getEmoBirthdayAnswer({ locale: 'en' }).includes('June 3, 2026'));
assert.ok(getEmoBirthdayAnswer({ locale: 'my' }).includes('ဇွန်လ ၃'));

assert.equal(isMiraBirthdayQuestion('Mira ရဲ့ မွေးနေ့က ဘယ်နေ့လဲ။'), true);
assert.ok(getMiraBirthdayAnswer({ locale: 'en' }).includes('July 27, 2026'));
assert.ok(getMiraBirthdayAnswer({ locale: 'my' }).includes('ဇူလိုင်လ ၂၇'));

assert.equal(isMiraBirthdayCompareQuestion('Do you and Emo have the same birthday?'), true);
const compare = getMiraBirthdayAnswer({ locale: 'en', compare: true });
assert.ok(compare.includes('June 3, 2026') && compare.includes('July 27, 2026'));

assert.equal(isEmoNameQuestion('What is your name?'), true);
assert.equal(isEmoNameQuestion('Who are you?'), true);
assert.equal(classifyEmoIntent('What is your name?').mode, 'sanctuary');
const emoName = getEmoNameAnswer({ locale: 'en' });
assert.ok(/I'm Emo/i.test(emoName));
assert.ok(!/Mira/i.test(emoName));

assert.equal(miraInputPlaceholder('en'), MIRA_INPUT_PLACEHOLDER_EN);
assert.equal(
  miraInputPlaceholder('my'),
  'Mira နဲ့ ဘာအကြောင်း ဆွေးနွေးချင်ပါသလဲရှင်။',
);
assert.equal(miraTagline('en'), MIRA_TAGLINE_EN);
assert.equal(miraTagline('en'), 'Research • Strategy • Wise Perspective');
assert.equal(miraTagline('my'), 'သုတေသန • မဟာဗျူဟာ • ဉာဏ်ပညာအမြင်');
assert.equal(miraEmptyInvite('en'), MIRA_EMPTY_INVITE_EN);
assert.equal(miraEmptyInvite('en'), 'Ask Mira to research, analyze, or guide you…');
assert.equal(
  miraEmptyInvite('my'),
  'Mira ကို သုတေသနလုပ်ခိုင်းပါ၊ ခွဲခြမ်းစိတ်ဖြာခိုင်းပါ၊ ဒါမှမဟုတ် အမြင်သစ်တွေနဲ့ လမ်းညွှန်ပေးစေပါ…',
);
// Auto + Burmese UI → Myanmar chrome (Mira language Auto)
assert.equal(miraTagline('auto', { uiLocale: 'my' }), miraTagline('my'));
assert.equal(miraEmptyInvite('auto', { uiLocale: 'my' }), miraEmptyInvite('my'));
assert.equal(miraInputPlaceholder('auto', { uiLocale: 'my' }), miraInputPlaceholder('my'));
assert.ok(miraInputPlaceholder('es').includes('Mira'));
assert.ok(miraInputPlaceholder('fr').includes('Mira'));
assert.ok(miraInputPlaceholder('pt-BR').includes('Mira'));
assert.ok(miraInputPlaceholder('id').includes('Mira'));
assert.equal(miraInputPlaceholder('unknown-locale'), MIRA_INPUT_PLACEHOLDER_EN);

console.log('OK — companion identity tests passed');
