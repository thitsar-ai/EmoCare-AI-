/**
 * Daily reminder time parsing + localized copy smoke test.
 * Run: node scripts/test-daily-reminders.mjs
 */
import assert from 'node:assert/strict';
import {
  DAILY_REMINDER_COPY_EN,
  DAILY_REMINDER_DATA_KIND,
  getDailyReminderCopy,
  getDailyReminderUiCopy,
  isDailyReminderResponse,
} from '../utils/dailyReminderCopy.js';
import { miraInputPlaceholder, MIRA_INPUT_PLACEHOLDER_EN } from '../utils/miraLanguage.js';
import { parseReminderTimeLabel } from '../utils/reminderTime.js';

assert.deepEqual(parseReminderTimeLabel('8:00 AM'), { hour: 8, minute: 0 });
assert.deepEqual(parseReminderTimeLabel('12:00 PM'), { hour: 12, minute: 0 });
assert.deepEqual(parseReminderTimeLabel('6:00 PM'), { hour: 18, minute: 0 });
assert.deepEqual(parseReminderTimeLabel('8:00 PM'), { hour: 20, minute: 0 });
assert.deepEqual(parseReminderTimeLabel('12:00 AM'), { hour: 0, minute: 0 });
assert.deepEqual(parseReminderTimeLabel(''), { hour: 20, minute: 0 });

assert.equal(getDailyReminderCopy('en').title, DAILY_REMINDER_COPY_EN.title);
assert.equal(
  getDailyReminderCopy('en').body,
  'Take a moment to check in with yourself today.',
);
assert.equal(getDailyReminderCopy('my').title, 'ကိုယ့်အတွက် နူးညံ့တဲ့ အချိန်လေး');
assert.ok(getDailyReminderCopy('my').body.includes('ဒီနေ့'));
assert.ok(getDailyReminderCopy('id').title.includes('Momen'));
assert.ok(getDailyReminderCopy('pt-BR').title.includes('momento'));
assert.ok(getDailyReminderCopy('fr').title.includes('douceur'));
assert.ok(getDailyReminderCopy('es').title.includes('calma'));
assert.deepEqual(getDailyReminderCopy('auto'), DAILY_REMINDER_COPY_EN);
assert.deepEqual(getDailyReminderCopy('unknown'), DAILY_REMINDER_COPY_EN);

assert.equal(getDailyReminderUiCopy('en').sheetTitle, 'Daily Reminder');
assert.ok(getDailyReminderUiCopy('my').sheetHint.length > 10);

assert.equal(
  isDailyReminderResponse({
    notification: { request: { content: { data: { kind: DAILY_REMINDER_DATA_KIND } } } },
  }),
  true,
);
assert.equal(
  isDailyReminderResponse({
    notification: { request: { content: { data: { kind: 'other' } } } },
  }),
  false,
);

assert.equal(miraInputPlaceholder('en'), MIRA_INPUT_PLACEHOLDER_EN);
assert.ok(miraInputPlaceholder('my').includes('ဆွေးနွေး'));
assert.ok(miraInputPlaceholder('es').includes('Mira'));
assert.equal(miraInputPlaceholder('missing'), MIRA_INPUT_PLACEHOLDER_EN);

console.log('OK — daily reminder + Mira placeholder localization');
