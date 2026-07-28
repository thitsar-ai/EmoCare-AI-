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
  isEmoAkoGyiPrivacyProbe,
  isEmoAkoGyiQuestion,
  isEmoAkoGyiWhoQuestion,
  isEmoBirthdayQuestion,
} from '../utils/emoIdentity.js';
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
for (const q of akoWhoQs) {
  assert.equal(isEmoAkoGyiWhoQuestion(q), true, q);
  assert.equal(isEmoAkoGyiQuestion(q), false, `should not be quote q: ${q}`);
  const who = getEmoAkoGyiWhoAnswer({ locale: /အကိုကြီး/.test(q) ? 'my' : 'en' });
  assert.ok(/private|မျှဝေထားပါဘူး/i.test(who), `privacy missing for: ${q}`);
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

console.log('OK — companion identity tests passed');
