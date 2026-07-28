# Simulator QA notes (Phase 2)

## What was run in CI / Cursor

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Pass |
| `npm run test:smoke` (identity, reminders, ui-language, i18n validate, onboarding, nav, EOS) | Pass |
| Live Anthropic EOS probes | Pass (retry/skip on 529/429) |
| Interactive iOS Simulator UI (all sizes × 6 languages) | **Not run in this environment** |
| Android Emulator UI | **Not run in this environment** |
| `eas build` / `expo run:ios` full binary | **Not run in this environment** |

## Recommended simulator matrix (human / local)

Run on Simulator/Emulator before TestFlight:

**iOS:** iPhone SE (small), iPhone 16 (standard), iPhone 16 Pro Max (large / Dynamic Island).  
**Android (if shipping):** small / standard / large phone AVDs.

For each of **en, my, id, pt-BR, fr, es** on at least one small + one large phone:

- Home, Check-in, My Day, Talk, Journal, Mira, Insights, Memory Ledger, Settings
- Reminder sheet, Passcode, Onboarding review
- Keyboard open on Talk / Mira / Journal
- Myanmar headers: no glyph clipping
- Long placeholders wrap; sheets scroll

## Automated UI tests

Detox/Maestro not present in the repo. Phase 2 adds Node smoke + localization validation instead of device UI automation. Physical-device checklist: `docs/TESTFLIGHT_DEVICE_QA_CHECKLIST.md`.
