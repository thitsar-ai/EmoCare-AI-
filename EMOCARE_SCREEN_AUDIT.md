# EmoCare AI — Screen Audit

Audit date: June 6, 2026  
Router: custom state (`MainScreenKey`) in `AppNavigation.tsx` + `App.tsx`  
Official route map: `components/navigation/navigationMap.ts`

## Screen inventory

| # | Screen | Route key | Component | Entry points | Tab bar |
|---|--------|-----------|-----------|--------------|---------|
| 1 | Launch splash | — | `SplashScreen` in `App.tsx` | Cold start | No |
| 2 | Onboarding Welcome | slide 2 | `OnboardingFlow.tsx` | First launch, app menu | No |
| 3 | Age gate | slide 3 | `OnboardingFlow.tsx` | First launch, returning users | No |
| 4 | Privacy | slide 4 | `OnboardingFlow.tsx` | Onboarding, app menu | No |
| 5 | Tell Me About You | slide 5 | `OnboardingFlow.tsx` | Onboarding, app menu | No |
| 6 | Home / Sanctuary | `home` | `SanctuaryDashboard.tsx` | Tab, menu, post-onboarding | Yes |
| 7 | Check In | `checkin` | `CheckInScreen` in `App.tsx` | Tab, home cards, menu | Yes |
| 8 | Today's Dashboard | `today` | `TodayDashboardScreen.tsx` | Tab, menu | Yes |
| 9 | Emo Chat (Talk) | `talk` | `ChatScreen` in `App.tsx` | Tab, home card, journal | Yes |
| 10 | Voice Talk | `voice` | `VoiceTalkScreen.tsx` | Menu, flow swipe | Yes* |
| 11 | Journal | `journal` | `JournalScreen.tsx` | Tab, home, menu | Yes |
| 12 | Breathe | `breathe` | `BreatheExperience.tsx` | Home quick action, menu | Yes* |
| 13 | Oracle | `oracle` | `OracleSearchScreen.tsx` | Menu, flow swipe | No |
| 14 | Insights | `insights` | `InsightsScreen.tsx` | Home row, Oracle save | No |
| 15 | Memory Ledger | `memoryledger` | `MemoryLedgerScreen.tsx` | Settings, chips, menu | No |
| 16 | Settings | `settings` | `SettingsScreen.tsx` | Menu, flow swipe | No |

\*Tab bar visible; highlight aliases to Talk / Journal.

## Navigation behavior

- **Back / forward**: `ScreenNavChrome` chevrons + edge swipe (`ScreenSwipeEdgeOverlay`)
- **Linear flow**: `FULL_APP_FLOW` in `AppNavigation.tsx`
- **Home**: tab `home` or menu Home

## Issues addressed in this pass

| Screen | Issue | Status |
|--------|-------|--------|
| Splash | White native splash | Fixed |
| Journal | Save/input overlap | Fixed |
| Oracle | Title overlap, face covered | Fixed |
| Talk | Header alignment | Fixed |
| Sanctuary | Nav outside card | Fixed |
| Memory Ledger | Fake building context | Fixed |
| Today | Demo seed tasks | Fixed |
| Settings | Delete all / safety copy | Fixed |
