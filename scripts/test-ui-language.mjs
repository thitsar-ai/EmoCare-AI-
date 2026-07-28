#!/usr/bin/env node
/**
 * Language state + reminder copy + Talk/Mira independence.
 * Run: node scripts/test-ui-language.mjs
 */
import assert from 'node:assert/strict';
import { resolveUiLocale, t, LANGUAGE_MODEL_DOC } from '../utils/uiCopy/index.js';
import { normalizeChatLanguage } from '../utils/chatLanguage.js';
import { normalizeMiraLanguage, miraInputPlaceholder } from '../utils/miraLanguage.js';
import { getDailyReminderCopy } from '../utils/dailyReminderCopy.js';
import { DEFAULT_SETTINGS } from '../utils/settingsStorage.js';

assert.ok(LANGUAGE_MODEL_DOC.includes('miraLanguage'));
assert.ok(LANGUAGE_MODEL_DOC.includes('chatLanguage'));

// First launch / defaults
assert.equal(DEFAULT_SETTINGS.notificationsEnabled, false);
assert.equal(normalizeChatLanguage(DEFAULT_SETTINGS.chatLanguage), 'auto');
assert.equal(normalizeMiraLanguage(DEFAULT_SETTINGS.miraLanguage), 'auto');
assert.equal(resolveUiLocale(DEFAULT_SETTINGS.chatLanguage), 'en');

// Persistence shape (normalize round-trip)
assert.equal(normalizeChatLanguage('my'), 'my');
assert.equal(normalizeChatLanguage('pt'), 'pt-BR');
assert.equal(normalizeMiraLanguage('fr'), 'fr');

// Language switching UI
assert.equal(t('en', 'nav.home'), 'Home');
assert.notEqual(t('my', 'nav.home'), t('en', 'nav.home'));
assert.notEqual(t('es', 'settings.title'), t('en', 'settings.title'));
assert.notEqual(t('fr', 'journal.title'), t('en', 'journal.title'));

// Onboarding "Tell me about you" chrome follows chatLanguage (Emo language)
assert.equal(resolveUiLocale('my'), 'my');
assert.notEqual(t('my', 'onboarding.aboutYouTitle'), t('en', 'onboarding.aboutYouTitle'));
assert.notEqual(t('my', 'onboarding.emoLanguage'), t('en', 'onboarding.emoLanguage'));
assert.ok(t('my', 'onboarding.aboutYouTitle').length > 0);

// Home sanctuary line — exact approved Burmese (not English leftover)
assert.equal(t('en', 'home.sanctuarySub'), 'This is Your Sanctuary.');
assert.equal(
  t('my', 'home.sanctuarySub'),
  'ဒီနေရာလေးက သင့်စိတ်အတွက် နွေးထွေးလုံခြုံတဲ့ ခိုလှုံရာလေးပါ။',
);
assert.ok(!t('my', 'home.sanctuarySub').includes('♡'));
assert.notEqual(t('my', 'home.sanctuarySub'), t('en', 'home.sanctuarySub'));

// English fallback
assert.equal(resolveUiLocale('auto'), 'en');
assert.equal(resolveUiLocale('xx-YY'), 'en');
assert.equal(t('auto', 'nav.talk'), t('en', 'nav.talk'));
assert.equal(t('missing-locale', 'common.save'), t('en', 'common.save'));

// Reminder copy after language change
const enRem = getDailyReminderCopy('en');
const myRem = getDailyReminderCopy('my');
assert.equal(enRem.title, 'A gentle moment for you');
assert.notEqual(myRem.title, enRem.title);
assert.equal(getDailyReminderCopy('auto').title, enRem.title);

// Talk vs Mira independence
assert.ok(miraInputPlaceholder('es').includes('Mira'));
assert.ok(miraInputPlaceholder('my').includes('Mira'));
// UI can be English while Mira placeholder is Burmese
assert.equal(resolveUiLocale('en'), 'en');
assert.notEqual(miraInputPlaceholder('my'), miraInputPlaceholder('en'));

// Missing translation → English key fallback path (unknown key returns key)
assert.equal(t('en', 'this.key.does.not.exist'), 'this.key.does.not.exist');

console.log('OK — UI language + reminder + Talk/Mira independence');
