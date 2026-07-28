#!/usr/bin/env node
/**
 * Keyboard sticky-composer pad math (no React Native runtime).
 * Run: node scripts/test-keyboard-inset.mjs
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// stickyComposerBottomPad is in a .ts file — load via transpile-free duplicate for smoke,
// or inline the formula to keep Node tests free of RN.
function stickyComposerBottomPad(opts) {
  if (opts.keyboardOpen) {
    return Math.max(0, opts.keyboardHeight);
  }
  return opts.tabBarHeight + Math.max(opts.safeBottom, 0);
}

assert.equal(
  stickyComposerBottomPad({
    keyboardOpen: true,
    keyboardHeight: 336,
    tabBarHeight: 72,
    safeBottom: 34,
  }),
  336,
  'open: use keyboard height only (no safe-area double pad)',
);

assert.equal(
  stickyComposerBottomPad({
    keyboardOpen: false,
    keyboardHeight: 0,
    tabBarHeight: 72,
    safeBottom: 34,
  }),
  106,
  'closed: tab bar + safe bottom',
);

assert.equal(
  stickyComposerBottomPad({
    keyboardOpen: true,
    keyboardHeight: 0,
    tabBarHeight: 72,
    safeBottom: 34,
  }),
  0,
  'floating/hardware keyboard may report 0 height',
);

console.log('OK — keyboard sticky composer inset math');
