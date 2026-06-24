/**
 * Official EmoCare app route order and metadata.
 * Screen order MUST match MAIN_APP_MENU + Settings in AppNavigation.tsx.
 *
 * Main-app back uses visit history (AppNavProvider).
 * The app menu is the primary path to secondary screens.
 */

import {
  MAIN_SCREEN_MENU_ORDER,
  ONBOARDING_MENU_SLIDES,
} from './AppNavigation';

export type AppRouteKey =
  | 'splash'
  | 'onboarding'
  | 'home'
  | 'checkin'
  | 'today'
  | 'talk'
  | 'journal'
  | 'oracle'
  | 'insights'
  | 'memoryledger'
  | 'settings';

export type RouteMeta = {
  key: AppRouteKey;
  label: string;
  component: string;
  tabBar?: boolean;
  flowOrder: number;
};

const ONBOARDING_ROUTE_LABELS: Record<(typeof ONBOARDING_MENU_SLIDES)[number], { label: string; component: string }> = {
  2: { label: 'Welcome', component: 'OnboardingFlow slide 2' },
  4: { label: 'Privacy', component: 'OnboardingFlow slide 4' },
  5: { label: 'Tell Me About You', component: 'OnboardingFlow slide 5' },
};

const MAIN_ROUTE_META: Record<
  (typeof MAIN_SCREEN_MENU_ORDER)[number],
  { label: string; component: string; tabBar?: boolean }
> = {
  home: { label: 'Home / Sanctuary', component: 'SanctuaryDashboard', tabBar: true },
  checkin: { label: 'Check In', component: 'CheckInScreen', tabBar: true },
  today: { label: "Today's Dashboard", component: 'TodayDashboardScreen', tabBar: true },
  talk: { label: 'Talk', component: 'ChatScreen', tabBar: true },
  journal: { label: 'Journal', component: 'JournalScreen', tabBar: true },
  oracle: { label: 'Oracle', component: 'OracleSearchScreen' },
  insights: { label: 'Insights', component: 'InsightsScreen' },
  memoryledger: { label: 'Memory Ledger', component: 'MemoryLedgerScreen' },
  settings: { label: 'Settings', component: 'SettingsScreen' },
};

/** Guided tour order (onboarding review slides, then main screens) — mirrors app menu. */
export const APP_ROUTE_FLOW: RouteMeta[] = [
  ...ONBOARDING_MENU_SLIDES.map((slide, index) => ({
    key: 'onboarding' as const,
    label: ONBOARDING_ROUTE_LABELS[slide].label,
    component: ONBOARDING_ROUTE_LABELS[slide].component,
    flowOrder: index + 1,
  })),
  ...MAIN_SCREEN_MENU_ORDER.map((key, index) => ({
    key: key as AppRouteKey,
    label: MAIN_ROUTE_META[key].label,
    component: MAIN_ROUTE_META[key].component,
    tabBar: MAIN_ROUTE_META[key].tabBar,
    flowOrder: ONBOARDING_MENU_SLIDES.length + index + 1,
  })),
];

export const TAB_BAR_ROUTE_KEYS: AppRouteKey[] = [
  'home',
  'checkin',
  'today',
  'talk',
  'journal',
];

/** Screens that show the bottom tab bar. */
export const TAB_BAR_VISIBLE_KEYS: AppRouteKey[] = [...TAB_BAR_ROUTE_KEYS];
