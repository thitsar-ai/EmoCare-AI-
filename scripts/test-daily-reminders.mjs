/**
 * Daily reminder time parsing smoke test.
 * Run: node scripts/test-daily-reminders.mjs
 */
import assert from 'node:assert/strict';
import { parseReminderTimeLabel } from '../utils/reminderTime.js';

assert.deepEqual(parseReminderTimeLabel('8:00 AM'), { hour: 8, minute: 0 });
assert.deepEqual(parseReminderTimeLabel('12:00 PM'), { hour: 12, minute: 0 });
assert.deepEqual(parseReminderTimeLabel('6:00 PM'), { hour: 18, minute: 0 });
assert.deepEqual(parseReminderTimeLabel('8:00 PM'), { hour: 20, minute: 0 });
assert.deepEqual(parseReminderTimeLabel('12:00 AM'), { hour: 0, minute: 0 });
assert.deepEqual(parseReminderTimeLabel(''), { hour: 20, minute: 0 });

console.log('OK — daily reminder time parsing');
