/**
 * Verifies menu order, screen map coverage, and linear navigation helpers.
 * Run: node scripts/verifyNavigation.mjs
 */

const MAIN_SCREEN_MENU_ORDER = [
  'home',
  'checkin',
  'today',
  'talk',
  'journal',
  'oracle',
  'insights',
  'memoryledger',
  'settings',
];

const ONBOARDING_MENU_SLIDES = [2, 4, 5];

const FULL_APP_FLOW = [
  ...ONBOARDING_MENU_SLIDES.map((slide) => ({ kind: 'onboarding', slide })),
  ...MAIN_SCREEN_MENU_ORDER.map((key) => ({ kind: 'screen', key })),
];

const MAIN_APP_MENU_SCREEN_KEYS = [
  'home',
  'checkin',
  'today',
  'talk',
  'journal',
  'oracle',
  'insights',
  'memoryledger',
];

const ROOT_MAIN_SCREENS = [
  'home',
  'checkin',
  'talk',
  'journal',
  'insights',
  'memoryledger',
  'settings',
  'oracle',
  'today',
];

function screenHistoryForMenuTarget(key) {
  const idx = MAIN_SCREEN_MENU_ORDER.indexOf(key);
  if (idx < 0) return [key];
  return MAIN_SCREEN_MENU_ORDER.slice(0, idx + 1);
}

function getNextScreenInFlow(current) {
  const start = FULL_APP_FLOW.findIndex((s) => s.kind === 'screen' && s.key === current);
  if (start < 0) return null;
  for (let i = start + 1; i < FULL_APP_FLOW.length; i++) {
    const step = FULL_APP_FLOW[i];
    if (step.kind === 'screen') return step.key;
  }
  return null;
}

function getOnboardingStepBeforeHome() {
  const homeIdx = FULL_APP_FLOW.findIndex((s) => s.kind === 'screen' && s.key === 'home');
  if (homeIdx <= 0) return null;
  return homeIdx - 1;
}

function canGoBackFromScreen(screen, history) {
  if (history.length > 1) return true;
  return screen === 'home' && getOnboardingStepBeforeHome() != null;
}

function canGoForwardFromScreen(screen, forwardHistory) {
  if (forwardHistory.length > 0) return true;
  return getNextScreenInFlow(screen) != null;
}

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    failed += 1;
  }
}

// Menu screen keys match flow (excluding settings which is separate in menu)
assert(
  JSON.stringify(MAIN_APP_MENU_SCREEN_KEYS) ===
    JSON.stringify(MAIN_SCREEN_MENU_ORDER.filter((k) => k !== 'settings')),
  'MAIN_APP_MENU screen keys match MAIN_SCREEN_MENU_ORDER',
);

// Every main screen key has a RootMain entry
for (const key of MAIN_SCREEN_MENU_ORDER) {
  assert(ROOT_MAIN_SCREENS.includes(key), `RootMain maps screen "${key}"`);
}

// Menu history builds linear path
for (const key of MAIN_SCREEN_MENU_ORDER) {
  const history = screenHistoryForMenuTarget(key);
  assert(history[history.length - 1] === key, `Menu history ends on ${key}`);
  assert(history[0] === 'home', `Menu history for ${key} starts at home`);
  for (let i = 1; i < history.length; i++) {
    const prevIdx = MAIN_SCREEN_MENU_ORDER.indexOf(history[i - 1]);
    const curIdx = MAIN_SCREEN_MENU_ORDER.indexOf(history[i]);
    assert(curIdx === prevIdx + 1, `Menu history step ${history[i - 1]} → ${history[i]}`);
  }
}

// Back works after every menu jump (except home which goes to onboarding)
for (const key of MAIN_SCREEN_MENU_ORDER) {
  const history = screenHistoryForMenuTarget(key);
  assert(
    canGoBackFromScreen(key, history),
    `Back enabled after menu jump to ${key}`,
  );
}

// Forward works until settings
for (const key of MAIN_SCREEN_MENU_ORDER) {
  const next = getNextScreenInFlow(key);
  if (key === 'settings') {
    assert(next === null, 'Settings has no forward screen');
  } else {
    assert(next != null, `Forward target exists from ${key}`);
  }
}

// Linear forward chain from home to settings
let cursor = 'home';
const visited = [cursor];
while (cursor !== 'settings') {
  const next = getNextScreenInFlow(cursor);
  assert(next != null, `Broken forward chain at ${cursor}`);
  assert(!visited.includes(next), `Forward loop detected at ${next}`);
  visited.push(next);
  cursor = next;
}
assert(visited.length === MAIN_SCREEN_MENU_ORDER.length, 'Forward chain covers all menu screens');

// Every menu screen resolves in FULL_APP_FLOW
for (const key of MAIN_SCREEN_MENU_ORDER) {
  const idx = FULL_APP_FLOW.findIndex((s) => s.kind === 'screen' && s.key === key);
  assert(idx >= 0, `FULL_APP_FLOW contains ${key}`);
}

for (const slide of ONBOARDING_MENU_SLIDES) {
  const idx = FULL_APP_FLOW.findIndex((s) => s.kind === 'onboarding' && s.slide === slide);
  assert(idx >= 0, `FULL_APP_FLOW contains onboarding slide ${slide}`);
}

if (failed === 0) {
  console.log('OK: navigation verification passed');
  console.log(`  Flow steps: ${FULL_APP_FLOW.length}`);
  console.log(`  Menu screens: ${MAIN_SCREEN_MENU_ORDER.length}`);
  process.exit(0);
}

console.error(`\n${failed} check(s) failed`);
process.exit(1);
