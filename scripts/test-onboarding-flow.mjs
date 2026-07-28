/**
 * Onboarding routing smoke tests.
 * Run: node scripts/test-onboarding-flow.mjs
 */
import assert from 'node:assert/strict';
import {
  OB_CONTENT_SLIDES,
  OB_SLIDE,
  nextContentSlide,
  prevContentSlide,
  resolveBootDestination,
} from '../utils/onboardingFlowOrder.js';

// Must match AppNavigation / FirstOnboardingShell
assert.equal(OB_SLIDE.welcome, 2);
assert.equal(OB_SLIDE.ageGate, 3);
assert.equal(OB_SLIDE.privacy, 4);
assert.equal(OB_SLIDE.aboutYou, 5);
assert.equal(OB_SLIDE.feeling, 6);
assert.equal(OB_SLIDE.ready, 7);
assert.deepEqual(OB_CONTENT_SLIDES, [2, 4, 5, 6, 7]);

// Content order — never Welcome(2) → Age(3)
assert.equal(nextContentSlide(2), 4, 'Welcome advances to Privacy');
assert.equal(nextContentSlide(4), 5, 'Privacy advances to About You');
assert.equal(nextContentSlide(5), 6, 'About You advances to Feeling');
assert.equal(nextContentSlide(6), 7, 'Feeling advances to Ready');
assert.equal(nextContentSlide(7), null);
assert.equal(prevContentSlide(7), 6);
assert.equal(prevContentSlide(6), 5);
assert.equal(prevContentSlide(5), 4);
assert.equal(prevContentSlide(4), 2);
assert.equal(prevContentSlide(2), null);
assert.notEqual(nextContentSlide(2), 3, 'must not skip Privacy via age slide');

// Boot destination
assert.equal(resolveBootDestination({ completed: false }), 'welcome');
assert.equal(resolveBootDestination({ completed: true }), 'home');

console.log('OK — onboarding flow order verified');
console.log(
  '  New user: Welcome → Privacy → Age (if needed) → About You → Feeling → Ready → Home',
);
console.log('  Returning user: Home');
