#!/usr/bin/env node
/**
 * Localization validation — fails when required locale keys are missing.
 * Run: node scripts/validate-localization.mjs
 */
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getMissingKeysByLocale,
  LANGUAGE_MODEL_DOC,
  listUiKeys,
  resolveUiLocale,
  t,
  UI_LOCALES,
} from '../utils/uiCopy/index.js';
import { miraInputPlaceholder, MIRA_INPUT_PLACEHOLDER_EN } from '../utils/miraLanguage.js';
import {
  getDailyReminderCopy,
  DAILY_REMINDER_COPY_EN,
} from '../utils/dailyReminderCopy.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const AUDITED_GLOBS = [
  'components/home/SanctuaryDashboard.tsx',
  'components/deep/SettingsScreen.tsx',
  'components/deep/InsightsScreen.tsx',
  'components/deep/MemoryLedgerScreen.tsx',
  'components/deep/TodayDashboardScreen.tsx',
  'components/deep/OracleSearchScreen.tsx',
  'components/journal/JournalScreen.tsx',
  'components/checkin/CheckInCompleteOverlay.tsx',
  'components/checkin/FeelingIntensityPicker.tsx',
  'components/security/PasscodeLockScreen.tsx',
  'components/security/PasscodeSetupSheet.tsx',
  'components/talk/TalkAiConsentSheet.tsx',
  'components/talk/MiraLanguageSheet.tsx',
  'components/talk/TalkLanguageSheet.tsx',
  'components/onboarding/OnboardingFlow.tsx',
  'components/shared/MoodPicker.tsx',
];

/** English UI phrases that should not remain hard-coded in audited components. */
const BANNED_LITERALS = [
  'Push delivery is still rolling out',
  'Start Conversation',
  'Check-In Complete',
  'Before You Talk with Emo',
];

let failed = false;
function fail(msg) {
  failed = true;
  console.error(`FAIL  ${msg}`);
}
function ok(msg) {
  console.log(`PASS  ${msg}`);
}

console.log('\n=== Localization validation ===\n');
console.log(`Language model: ${LANGUAGE_MODEL_DOC}\n`);

const keys = listUiKeys();
ok(`English catalog keys: ${keys.length}`);

assert.equal(resolveUiLocale('auto'), 'en');
assert.equal(resolveUiLocale('my'), 'my');
assert.equal(resolveUiLocale('pt-BR'), 'pt-BR');
assert.equal(resolveUiLocale('unknown'), 'en');
ok('resolveUiLocale auto/unknown → en');

const missing = getMissingKeysByLocale();
for (const locale of UI_LOCALES) {
  if (locale === 'en') continue;
  const list = missing[locale] || [];
  if (list.length) {
    fail(`${locale}: ${list.length} missing keys — ${list.slice(0, 8).join(', ')}${list.length > 8 ? '…' : ''}`);
  } else {
    ok(`${locale}: all ${keys.length} keys present`);
  }
}

// Extra unused keys in non-en catalogs
for (const locale of UI_LOCALES) {
  if (locale === 'en') continue;
  const catalog = (await import(`../utils/uiCopy/catalog.${locale === 'pt-BR' ? 'pt-BR' : locale}.js`)).default;
  const extras = Object.keys(catalog).filter((k) => !keys.includes(k));
  if (extras.length) {
    console.warn(`WARN  ${locale}: ${extras.length} extra keys not in English — ${extras.slice(0, 5).join(', ')}`);
  }
}

// Empty translations
for (const locale of UI_LOCALES) {
  for (const key of keys) {
    const value = t(locale, key);
    if (!value || !String(value).trim()) {
      fail(`${locale}.${key} is empty`);
    }
  }
}
ok('No empty translations after English fallback');

// Values identical to English where translation is expected (warn, don't fail for brand names)
const brandKeys = new Set([
  'brand.appName',
  'nav.mira',
  'home.mira',
  'common.ok',
]);
let identicalCount = 0;
for (const locale of UI_LOCALES) {
  if (locale === 'en') continue;
  for (const key of keys) {
    if (brandKeys.has(key)) continue;
    if (key.startsWith('brand.')) continue;
    const en = t('en', key);
    const loc = t(locale, key);
    if (en === loc && /[A-Za-z]{4,}/.test(en) && !/\bEmo\b|\bMira\b|\bEmoCare\b/.test(en.replace(/Emo|Mira|EmoCare/g, ''))) {
      // Skip short shared tokens; flag longer English leftovers
      if (en.split(/\s+/).length >= 3) {
        identicalCount++;
        if (identicalCount <= 12) {
          console.warn(`WARN  ${locale}.${key} identical to English: "${en.slice(0, 60)}"`);
        }
      }
    }
  }
}
if (identicalCount > 12) console.warn(`WARN  …and ${identicalCount - 12} more identical-to-English strings`);
ok(`Identical-to-English scan complete (${identicalCount} longer phrases flagged as warnings)`);

// Mira + reminder keys
assert.equal(miraInputPlaceholder('en'), MIRA_INPUT_PLACEHOLDER_EN);
assert.ok(miraInputPlaceholder('my').includes('Mira'));
assert.deepEqual(getDailyReminderCopy('en'), DAILY_REMINDER_COPY_EN);
assert.ok(getDailyReminderCopy('es').title.length > 3);
ok('miraInputPlaceholder + daily reminder copy OK');

// Hard-coded English scan in audited components
for (const rel of AUDITED_GLOBS) {
  const path = join(root, rel);
  let src;
  try {
    src = readFileSync(path, 'utf8');
  } catch {
    fail(`missing audited file ${rel}`);
    continue;
  }
  // Skip if file uses useUiCopy / t( — still check banned literals outside comments
  for (const lit of BANNED_LITERALS) {
    if (src.includes(`'${lit}'`) || src.includes(`"${lit}"`) || src.includes(`\`${lit}`)) {
      // Allow if only appears inside catalog import comments — still fail for JSX string literals
      fail(`${rel} still contains hard-coded "${lit}"`);
    }
  }
}
ok('Banned hard-coded literals scan on audited components');

if (failed) {
  console.error('\nLocalization validation FAILED\n');
  process.exit(1);
}
console.log('\nLocalization validation PASSED\n');
