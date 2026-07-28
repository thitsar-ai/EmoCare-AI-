# EmoCare TestFlight — Physical Device QA Checklist

Use this checklist on a real iPhone (and Android if shipping).  
Mark each item **Pass / Fail**, add notes, and do not mark the build release-ready until critical items pass.

**Build under test:** _______________  
**Tester:** _______________  
**Date:** _______________  
**Device / OS:** _______________

---

## Language model (reference)

| Layer | Controlled by | Notes |
|-------|---------------|--------|
| App UI + daily reminder copy | Settings → **Emo language** (`chatLanguage`) | `auto` → English UI |
| Emo Talk replies | Same Emo language | Independent compose detection when Auto |
| Mira replies + Mira placeholder | Mira globe → **Mira language** | Independent of Emo language |

---

## A. Daily reminders

| # | Item | Preconditions | Steps | Expected | Pass/Fail | Notes |
|---|------|---------------|-------|----------|-----------|-------|
| 1 | Permission not requested | Fresh install or notifications never prompted | Open Settings → Daily reminders; do not enable | Reminder shows **Off**; no OS prompt yet | | |
| 2 | Enable reminder | Reminders Off | Enable → pick time → Save | Permission prompt appears (or Settings path if denied) | | |
| 3 | Permission granted | Prompt shown | Allow | Reminder shows On · time; one daily schedule | | |
| 4 | Permission denied | Prompt shown | Don’t Allow | Reminder stays Off; localized explanation | | |
| 5 | Permanently denied | Previously denied | Enable → Save | Explanation + **Open Settings** | | |
| 6 | Open Settings path | From denied alert | Tap Open Settings | iOS Settings for EmoCare opens | | |
| 7 | Reminder at selected time | Enabled; wait or advance clock carefully | Wait until selected local time | Notification with localized title/body | | |
| 8 | Change reminder time | Enabled | Change chip → Save | Old time cancelled; new time only | | |
| 9 | Disable reminder | Enabled | Turn off → Save | No pending daily reminder | | |
| 10 | Re-enable | Disabled; permission already granted | Enable → Save | Schedules again; no duplicate IDs | | |
| 11 | Restart app | Enabled | Force quit → reopen | Still On · same time; no new permission prompt | | |
| 12 | Restart phone | Enabled | Reboot device → open app | Preference restored; schedule intact | | |
| 13 | Foreground delivery | Enabled; app open | At fire time | Banner/list shows | | |
| 14 | Background delivery | App backgrounded | At fire time | Notification delivered | | |
| 15 | Killed-app delivery | App swiped away | At fire time | Notification delivered | | |
| 16 | Tap from foreground | Notification visible | Tap | Opens **Check-in** | | |
| 17 | Tap from background | | Tap | Opens Check-in | | |
| 18 | Tap from killed | | Tap cold start | Opens Check-in (not blank) | | |
| 19 | Cold-start navigation | From killed tap | Observe first screen after splash | Lands on Check-in once (no loop) | | |
| 20 | Timezone change | Enabled | Change device TZ | Next fire follows device-local DAILY hour | | |
| 21 | DST change | Enabled near DST | Observe across transition | Still one daily fire at wall-clock time | | |
| 22 | Language change after schedule | Enabled | Change Emo language → reopen Settings | Next notification uses new language copy; no duplicates | | |
| 23 | Enable/disable cycles | | Toggle 5× | Ends in expected state; one schedule max | | |
| 24 | No duplicate reminders | iOS pending list / feel | Enable twice | Only one daily reminder | | |

---

## B. Chat and keyboard

| # | Item | Preconditions | Steps | Expected | Pass/Fail | Notes |
|---|------|---------------|-------|----------|-----------|-------|
| B1 | First Emo message | Talk empty | Send short message | Reply streams once; no rewrite flicker | | |
| B2 | Multi-turn Emo | | 5+ turns | Order correct; scroll to latest | | |
| B3 | First Mira message | Ask Mira | Send question | Mira reply; correct title | | |
| B4 | Deep Research | Mira | Select Deep Research → ask | Sources / progress behave; no overlap | | |
| B5 | Long response | | Ask for detail | No clip under composer | | |
| B6 | Long Burmese | Emo/Mira language MY | Long MY reply | No top/bottom glyph clipping | | |
| B7 | Emoji message | | Send emoji-only | Handled gracefully | | |
| B8 | Offline send | Airplane mode | Send | Clear error / retry path | | |
| B9 | Retry | After failure | Retry | Recovers or clear failure | | |
| B10 | Keyboard open | Talk/Mira/Journal | Focus input | Composer above keyboard | | |
| B11 | Keyboard dismiss | | Dismiss | Layout restores; nav usable | | |
| B12 | Composer not hidden | Safe area devices | | Home indicator clear | | |
| B13 | Newest visible | Long thread | Send | Auto-scroll to newest | | |
| B14 | Cold resume | Mid-chat | Background → kill → reopen | History persists | | |
| B15 | Chat persistence | | Relaunch | Same thread | | |
| B16 | History reopen | If history UI | Open prior chat | Loads correctly | | |
| B17 | Name identity | Talk | “What is your name?” | Locked Emo answer; no Mira; no type-then-rewrite | | |
| B18 | A Ko Gyi who | Talk | “Who is A Ko Gyi?” | Approved privacy-safe answer | | |

---

## C. Localization (all six languages)

For each language (en, my, id, pt-BR, fr, es): set **Emo language** in Settings, then spot-check:

| Screen | Pass/Fail | Notes (wrapping / clipping) |
|--------|-----------|-------------------------------|
| Home | | |
| Check-in | | |
| My Day | | |
| Talk (chrome) | | |
| Journal | | |
| Mira (+ placeholder; set Mira language too) | | |
| Insights | | |
| Memory Ledger | | |
| Settings | | |
| Reminder sheet | | |
| Menus | | |
| Alerts | | |
| Passcode | | |
| Onboarding (View Introduction Again) | | |

Extra:

| # | Item | Expected | Pass/Fail | Notes |
|---|------|----------|-----------|-------|
| C1 | Long text MY/PT/FR/ES | Wraps; not truncated | | |
| C2 | Myanmar glyph clipping | Headers/inputs have enough line height | | |
| C3 | Language persists | Kill app → reopen → same Emo language | | |
| C4 | Mira language independent | UI French + Mira Myanmar placeholder OK | | |

---

## D. Security and data

| # | Item | Steps | Expected | Pass/Fail | Notes |
|---|------|-------|----------|-----------|-------|
| D1 | Passcode create/lock | Enable passcode → background → return | Lock screen | | |
| D2 | Biometric (if available) | Enable biometric unlock | Works or clear error | | |
| D3 | Delete all data | Settings → Delete all → confirm | Data cleared; onboarding/home per design | | |
| D4 | After deletion restart | Relaunch | Clean state | | |
| D5 | Language persistence | Set MY → restart | Still MY | | |
| D6 | Reminder persistence | Set On 8PM → restart | Still On 8PM (if permitted) | | |
| D7 | Journal persistence | Save entry → restart | Present | | |
| D8 | Check-in persistence | Complete check-in → restart | Already-checked-in correct for local day | | |
| D9 | Chat persistence | Talk history → restart | Present | | |

---

## Sign-off

| Question | Yes/No |
|----------|--------|
| All critical Daily Reminder items (1–19, 22–24) passed? | |
| Chat keyboard safe on this device? | |
| All six languages spot-checked without blocking truncation? | |
| Delete-all / passcode acceptable? | |
| **Ready for release?** (requires Yes on all above) | |

**Tester signature:** _______________
