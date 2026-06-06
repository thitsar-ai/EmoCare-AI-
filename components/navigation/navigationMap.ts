/**
 * Official EmoCare app route order and metadata.
 * Keep in sync with MainScreenKey in AppNavigation.tsx and screens map in App.tsx.
 *
 * Main-app back/forward uses visit history (AppNavProvider).
 * FULL_APP_FLOW in AppNavigation.tsx is only for onboarding review + guided forward tour.
 */

export type AppRouteKey =
  | 'splash'
  | 'onboarding'
  | 'home'
  | 'checkin'
  | 'today'
  | 'talk'
  | 'voice'
  | 'journal'
  | 'breathe'
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

/** Guided tour order (onboarding review slides, then main screens). */
export const APP_ROUTE_FLOW: RouteMeta[] = [
  { key: 'onboarding', label: 'Welcome', component: 'OnboardingFlow slide 2', flowOrder: 1 },
  { key: 'onboarding', label: 'Privacy', component: 'OnboardingFlow slide 4', flowOrder: 2 },
  { key: 'onboarding', label: 'Tell Me About You', component: 'OnboardingFlow slide 5', flowOrder: 3 },
  { key: 'home', label: 'Home / Sanctuary', component: 'SanctuaryDashboard', tabBar: true, flowOrder: 4 },
  { key: 'checkin', label: 'Check In', component: 'CheckInScreen', tabBar: true, flowOrder: 5 },
  { key: 'today', label: "Today's Dashboard", component: 'TodayDashboardScreen', tabBar: true, flowOrder: 6 },
  { key: 'talk', label: 'Emo Chat', component: 'ChatScreen', tabBar: true, flowOrder: 7 },
  { key: 'voice', label: 'Voice Talk', component: 'VoiceTalkScreen', flowOrder: 8 },
  { key: 'journal', label: 'Journal', component: 'JournalScreen', tabBar: true, flowOrder: 9 },
  { key: 'breathe', label: 'Breathe', component: 'BreatheExperience', flowOrder: 10 },
  { key: 'oracle', label: 'Oracle', component: 'OracleSearchScreen', flowOrder: 11 },
  { key: 'insights', label: 'Insights', component: 'InsightsScreen', flowOrder: 12 },
  { key: 'memoryledger', label: 'Memory Ledger', component: 'MemoryLedgerScreen', flowOrder: 13 },
  { key: 'settings', label: 'Settings', component: 'SettingsScreen', flowOrder: 14 },
];

export const TAB_BAR_ROUTE_KEYS: AppRouteKey[] = [
  'home',
  'checkin',
  'today',
  'talk',
  'journal',
];

/** Screens that show the bottom tab bar (includes voice + breathe with aliased highlights). */
export const TAB_BAR_VISIBLE_KEYS: AppRouteKey[] = [
  ...TAB_BAR_ROUTE_KEYS,
  'voice',
  'breathe',
];
