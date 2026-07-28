#!/usr/bin/env node
/**
 * Myanmar UI text metrics — no top clipping.
 * Run: node scripts/test-myanmar-text-metrics.mjs
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// StyleSheet.flatten needs RN — duplicate the pure math from applyMyanmarUiStyle.
function applyMyanmarUiStylePure(flatIn) {
  const flat = { ...flatIn };
  const fontSize = typeof flat.fontSize === 'number' ? flat.fontSize : 15;
  const minLineHeight = Math.ceil(fontSize * 1.78);
  if (typeof flat.lineHeight !== 'number' || flat.lineHeight < minLineHeight) {
    flat.lineHeight = minLineHeight;
  }
  if (!flat.fontFamily || /georgia|serif|times/i.test(String(flat.fontFamily))) {
    delete flat.fontFamily;
  }
  const minPadTop = Math.max(3, Math.round(fontSize * 0.2));
  flat.paddingTop = Math.max(Number(flat.paddingTop) || 0, minPadTop);
  flat.paddingBottom = Math.max(Number(flat.paddingBottom) || 0, Math.round(fontSize * 0.06));
  return flat;
}

// Nav label was the worst offender: fontSize 11 / lineHeight 13
const nav = applyMyanmarUiStylePure({ fontSize: 11, lineHeight: 13, fontWeight: '500' });
assert.ok(nav.lineHeight >= 20, `nav lineHeight too tight: ${nav.lineHeight}`);
assert.ok(nav.paddingTop >= 3, 'nav needs paddingTop');
assert.equal(nav.fontFamily, undefined);

// Georgia page titles
const title = applyMyanmarUiStylePure({
  fontSize: 26,
  lineHeight: 32,
  fontFamily: 'Georgia',
});
assert.ok(title.lineHeight >= Math.ceil(26 * 1.78));
assert.equal(title.fontFamily, undefined, 'Georgia must be cleared for Myanmar');

// Mood card title
const mood = applyMyanmarUiStylePure({ fontSize: 12, lineHeight: 16, fontWeight: '700' });
assert.ok(mood.lineHeight >= 22, `mood title lineHeight: ${mood.lineHeight}`);

console.log('OK — Myanmar text metrics (anti-clip)');
